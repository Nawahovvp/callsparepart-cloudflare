import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function apiDevServerPlugin() {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost:5173'}`);
        const pathname = urlObj.pathname;

        if (!pathname.startsWith('/api/')) {
          return next();
        }

        const route = pathname.replace(/^\/api\//, '').replace(/\/$/, '');
        let handlerModule;

        try {
          if (route === 'data') {
            handlerModule = await import('./functions/api/data.js');
          } else if (route === 'quick-data') {
            handlerModule = await import('./functions/api/quick-data.js');
          } else if (route === 'login') {
            handlerModule = await import('./functions/api/login.js');
          } else if (route === 'save') {
            handlerModule = await import('./functions/api/save.js');
          } else if (route === 'outside-request') {
            handlerModule = await import('./functions/api/outside-request.js');
          } else {
            return next();
          }

          const method = req.method.toUpperCase();
          const handler =
            (method === 'GET' ? handlerModule.onRequestGet : null) ||
            (method === 'POST' ? handlerModule.onRequestPost : null) ||
            handlerModule.onRequest;

          if (!handler) {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `Method ${method} not allowed` }));
            return;
          }

          const chunks = [];
          for await (const chunk of req) {
            chunks.push(chunk);
          }
          const bodyBuffer = Buffer.concat(chunks);
          const body = ['GET', 'HEAD'].includes(method)
            ? undefined
            : bodyBuffer.length > 0
            ? bodyBuffer.toString('utf-8')
            : undefined;

          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (value !== undefined && !['connection', 'content-length', 'host', 'transfer-encoding'].includes(key.toLowerCase())) {
              headers.set(key, Array.isArray(value) ? value.join(', ') : value);
            }
          }

          const webRequest = new Request(urlObj.href, {
            method,
            headers,
            body
          });

          const webResponse = await handler({
            request: webRequest,
            env: process.env,
            waitUntil: (p) => {
              Promise.resolve(p).catch((err) => console.warn('[waitUntil error]', err));
            }
          });

          res.statusCode = webResponse.status;
          webResponse.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });

          const arrayBuffer = await webResponse.arrayBuffer();
          res.end(Buffer.from(arrayBuffer));
        } catch (error) {
          console.error('[API dev server error]:', error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: error.message || 'Internal server error' }));
          }
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [react(), apiDevServerPlugin()],
  };
});
