import { clearSessionCookie, jsonResponse } from '../_shared.js';

export async function onRequestPost({ request }) {
    return jsonResponse({ ok: true }, 200, {
        'Set-Cookie': clearSessionCookie(request)
    });
}

export async function onRequest() {
    return jsonResponse({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
}
