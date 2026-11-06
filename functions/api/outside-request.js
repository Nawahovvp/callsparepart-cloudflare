import { forwardFormToAppsScript, jsonResponse, readJsonBody } from '../_shared.js';

const DEFAULT_OUTSIDE_REQUEST_URL = 'https://script.google.com/macros/s/AKfycbycEiGdjEFmLSPSqgBUBBntG0OnaatLTkNozlZTn0RRgZHiuL9HCWisIsmMqth9Dzrv/exec';

export async function onRequestPost({ request, env }) {
    const parsed = await readJsonBody(request);
    if (parsed.error) return parsed.error;

    const payload = {
        ...parsed.data,
        user: typeof parsed.data.user === 'string' ? parsed.data.user : '-'
    };
    const formData = new URLSearchParams({
        action: 'insertRequest',
        payload: JSON.stringify(payload)
    });

    return forwardFormToAppsScript(
        env?.OUTSIDE_REQUEST_URL || DEFAULT_OUTSIDE_REQUEST_URL,
        formData
    );
}

export async function onRequest() {
    return jsonResponse({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
}
