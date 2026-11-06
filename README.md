# Sparepart Call

React/Vite dashboard with Cloudflare Pages Functions. Google Sheets remains the source of truth; Pages Functions provide a same-origin API, combine data requests, and cache the combined response at Cloudflare's edge.

## Deploy with the Cloudflare dashboard

1. Push this repository to GitHub and open **Workers & Pages** in the Cloudflare dashboard.
2. Select **Create application > Pages > Connect to Git**, then select the repository.
3. Use `npm run build` as the build command and `dist` as the build output directory.
4. Add these variables under **Settings > Variables and Secrets** for production:
   - `NEW_PART_SAVE_URL`: the Google Apps Script `/exec` URL that handles status/project saves.
   - `LOGIN_LOG_URL`: the Google Apps Script `/exec` URL that accepts login events (optional).
5. Deploy. Pages discovers the API handlers under `functions/api/` automatically.

The source sheet URLs are defined in `functions/api/data.js`; the main call list comes from the `CallMaterial` sheet in the configured spreadsheet. The API returns all dashboard datasets in one request and caches the combined response at the edge for up to five minutes. The browser's IndexedDB cache remains available as a fallback.

## Local development

Run `npm install` and `npm run dev` for the Vite frontend. Pages API routes are available in Cloudflare's local Pages runtime; to test them locally, run `npm run build`, then `npx wrangler pages dev dist` from the repository root. Add the endpoint URLs to a local `.dev.vars` file to test writes; keep that file out of Git.

## Important security note

The existing employee password rule (the last four digits of the employee ID) is retained for compatibility; it is not suitable for strong authentication. The login endpoint only preserves the current UI gate and does not provide authorization for the publicly available sheet data or write endpoints. Protect the Pages app and write APIs with Cloudflare Access or implement real authentication before treating the dashboard as a secure system. Do not put Apps Script endpoint URLs in frontend code; configure them as Pages secrets/variables.
