import { forwardToAppsScript, jsonResponse, readJsonBody } from '../_shared';

export async function onRequestPost({ request, env }) {
    const parsed = await readJsonBody(request);
    if (parsed.error) return parsed.error;
    return forwardToAppsScript(env.NEW_PART_SAVE_URL, parsed.data);
}

export async function onRequest() {
    return jsonResponse({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
}
