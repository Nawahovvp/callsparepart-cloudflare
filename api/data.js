import { onRequestGet } from '../functions/api/data.js';
import { handleVercelRequest } from '../lib/vercel.js';

export default function handler(request, response) {
    return handleVercelRequest(request, response, 'GET', onRequestGet);
}
