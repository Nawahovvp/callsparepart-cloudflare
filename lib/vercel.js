import { Buffer } from 'node:buffer';
import process from 'node:process';
import { waitUntil as vercelWaitUntil } from '@vercel/functions';

function sendResponse(response, result) {
    result.statusCode = response.status;
    response.headers.forEach((value, key) => result.setHeader(key, value));
    return response.arrayBuffer().then(body => result.end(Buffer.from(body)));
}

export async function handleVercelRequest(request, response, method, handler) {
    if (request.method !== method) {
        return sendResponse(
            new Response(JSON.stringify({ error: 'Method not allowed' }), {
                status: 405,
                headers: {
                    'Allow': method,
                    'Content-Type': 'application/json; charset=utf-8',
                    'Cache-Control': 'no-store'
                }
            }),
            response
        );
    }

    const headers = new Headers();
    Object.entries(request.headers).forEach(([key, value]) => {
        if (value !== undefined && !['connection', 'content-length', 'host', 'transfer-encoding'].includes(key)) {
            headers.set(key, Array.isArray(value) ? value.join(', ') : value);
        }
    });

    const url = new URL(request.url || '/', `https://${request.headers.host || 'localhost'}`);
    const body = request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : typeof request.body === 'string'
            ? request.body
            : request.body === undefined
                ? undefined
                : JSON.stringify(request.body);
    const webRequest = new Request(url, { method, headers, body });
    const result = await handler({
        request: webRequest,
        env: process.env,
        waitUntil: vercelWaitUntil
    });

    return sendResponse(result, response);
}
