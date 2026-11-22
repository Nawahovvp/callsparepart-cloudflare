import { forwardToAppsScript, jsonResponse, readJsonBody } from '../_shared.js';

const DEFAULT_NEW_PART_SAVE_URL = 'https://script.google.com/macros/s/AKfycbwRKCZxTrzSiY1CSE54q-GMJYiCiXdrfj_CBXM2yLerGsExJUsH0UrPgiQcSP-btN45/exec';

export async function onRequestPost({ request, env }) {
    const parsed = await readJsonBody(request);
    if (parsed.error) return parsed.error;
    return forwardToAppsScript(
        env?.NEW_PART_SAVE_URL || DEFAULT_NEW_PART_SAVE_URL,
        parsed.data
    );
}

export async function onRequest() {
    return jsonResponse({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
}
