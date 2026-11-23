const MAX_BODY_LENGTH = 2 * 1024 * 1024;
const SESSION_COOKIE_NAME = 'csp_session';
const SESSION_TTL_SECONDS = 24 * 60 * 60;
const APP_REQUEST_HEADER = 'x-requested-with';
const APP_REQUEST_VALUE = 'CallSparePartApp';
const DEFAULT_SESSION_SECRET = 'callsparepart-session-secret-v1';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesToBase64Url(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(base64Url) {
    const padded = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        + '='.repeat((4 - (base64Url.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function getSessionSecret(env) {
    return env?.SESSION_SECRET || env?.AUTH_SECRET || DEFAULT_SESSION_SECRET;
}

async function getHmacKey(secret) {
    return crypto.subtle.importKey(
        'raw',
        textEncoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
    );
}

function isHttpsRequest(request) {
    const forwardedProto = request.headers.get('x-forwarded-proto');
    if (forwardedProto) {
        return forwardedProto.split(',')[0].trim().toLowerCase() === 'https';
    }
    try {
        return new URL(request.url).protocol === 'https:';
    } catch {
        return true;
    }
}

function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) return cookies;
    cookieHeader.split(';').forEach((part) => {
        const index = part.indexOf('=');
        if (index === -1) return;
        const key = part.slice(0, index).trim();
        const value = part.slice(index + 1).trim();
        if (key) cookies[key] = value;
    });
    return cookies;
}

export async function createSessionCookie(request, env, user) {
    const payload = {
        id: String(user?.IDRec || ''),
        exp: Date.now() + SESSION_TTL_SECONDS * 1000
    };
    const payloadEncoded = bytesToBase64Url(textEncoder.encode(JSON.stringify(payload)));
    const key = await getHmacKey(getSessionSecret(env));
    const signature = new Uint8Array(
        await crypto.subtle.sign('HMAC', key, textEncoder.encode(payloadEncoded))
    );
    const token = `${payloadEncoded}.${bytesToBase64Url(signature)}`;
    const attributes = [
        `${SESSION_COOKIE_NAME}=${token}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        `Max-Age=${SESSION_TTL_SECONDS}`
    ];
    if (isHttpsRequest(request)) {
        attributes.push('Secure');
    }
    return attributes.join('; ');
}

export function clearSessionCookie(request) {
    const attributes = [
        `${SESSION_COOKIE_NAME}=`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        'Max-Age=0'
    ];
    if (isHttpsRequest(request)) {
        attributes.push('Secure');
    }
    return attributes.join('; ');
}

export async function verifySession(request, env) {
    const cookies = parseCookies(request.headers.get('cookie'));
    const token = cookies[SESSION_COOKIE_NAME];
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadEncoded, signatureEncoded] = parts;
    if (!payloadEncoded || !signatureEncoded) return null;

    try {
        const key = await getHmacKey(getSessionSecret(env));
        const signatureBytes = base64UrlToBytes(signatureEncoded);
        const isValid = await crypto.subtle.verify(
            'HMAC',
            key,
            signatureBytes,
            textEncoder.encode(payloadEncoded)
        );
        if (!isValid) return null;

        const payload = JSON.parse(textDecoder.decode(base64UrlToBytes(payloadEncoded)));
        if (!payload?.id || typeof payload.exp !== 'number' || payload.exp <= Date.now()) {
            return null;
        }
        return payload;
    } catch {
        return null;
    }
}

export async function requireApiAccess(request, env) {
    const fetchMode = (request.headers.get('sec-fetch-mode') || '').toLowerCase();
    const fetchDest = (request.headers.get('sec-fetch-dest') || '').toLowerCase();
    const requestedWith = request.headers.get(APP_REQUEST_HEADER);

    if (fetchMode === 'navigate' || fetchDest === 'document' || requestedWith !== APP_REQUEST_VALUE) {
        return {
            error: jsonResponse({ error: 'Forbidden' }, 403, {
                'Cache-Control': 'no-store'
            })
        };
    }

    const session = await verifySession(request, env);
    if (!session) {
        return {
            error: jsonResponse({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, 401, {
                'Cache-Control': 'no-store'
            })
        };
    }

    return { session };
}

export function jsonResponse(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            ...headers
        }
    });
}

export async function readJsonBody(request) {
    const contentLength = Number(request.headers.get('Content-Length') || 0);
    if (contentLength > MAX_BODY_LENGTH) {
        return { error: jsonResponse({ error: 'Request body is too large' }, 413) };
    }

    const text = await request.text();
    if (text.length > MAX_BODY_LENGTH) {
        return { error: jsonResponse({ error: 'Request body is too large' }, 413) };
    }

    try {
        const data = JSON.parse(text);
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return { error: jsonResponse({ error: 'Request body must be a JSON object' }, 400) };
        }
        return { data };
    } catch {
        return { error: jsonResponse({ error: 'Invalid JSON request body' }, 400) };
    }
}

export async function forwardToAppsScript(targetUrl, payload) {
    if (!targetUrl) {
        return jsonResponse({ error: 'Backend endpoint is not configured in Cloudflare' }, 503);
    }

    let target;
    try {
        target = new URL(targetUrl);
    } catch {
        return jsonResponse({ error: 'Backend endpoint configuration is invalid' }, 500);
    }

    if (target.protocol !== 'https:' || target.hostname !== 'script.google.com') {
        return jsonResponse({ error: 'Backend endpoint must be a Google Apps Script HTTPS URL' }, 500);
    }

    try {
        const upstream = await fetch(target, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload),
            redirect: 'follow'
        });
        const body = await upstream.text();
        return new Response(body, {
            status: upstream.status,
            headers: {
                'Content-Type': upstream.headers.get('Content-Type') || 'text/plain; charset=utf-8',
                'Cache-Control': 'no-store'
            }
        });
    } catch (error) {
        console.error('Apps Script request failed:', error);
        return jsonResponse({ error: 'Could not reach the configured Google Apps Script endpoint' }, 502);
    }
}

export async function forwardFormToAppsScript(targetUrl, formData) {
    if (!targetUrl) {
        return jsonResponse({ error: 'Outside request endpoint is not configured' }, 503);
    }

    let target;
    try {
        target = new URL(targetUrl);
    } catch {
        return jsonResponse({ error: 'Outside request endpoint configuration is invalid' }, 500);
    }

    if (target.protocol !== 'https:' || target.hostname !== 'script.google.com') {
        return jsonResponse({ error: 'Outside request endpoint must be a Google Apps Script HTTPS URL' }, 500);
    }

    try {
        const upstream = await fetch(target, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString(),
            redirect: 'follow'
        });
        const body = await upstream.text();
        return new Response(body, {
            status: upstream.status,
            headers: {
                'Content-Type': upstream.headers.get('Content-Type') || 'text/plain; charset=utf-8',
                'Cache-Control': 'no-store'
            }
        });
    } catch (error) {
        console.error('Outside request Apps Script call failed:', error);
        return jsonResponse({ error: 'Could not reach the outside request Apps Script endpoint' }, 502);
    }
}
