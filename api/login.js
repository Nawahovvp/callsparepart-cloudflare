import { onRequestPost } from '../functions/api/login.js';
import { handleVercelRequest } from '../lib/vercel.js';

export default function handler(request, response) {
    return handleVercelRequest(request, response, 'POST', onRequestPost);
}
