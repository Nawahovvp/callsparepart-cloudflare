const MAX_BODY_LENGTH = 2 * 1024 * 1024;

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
