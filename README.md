# Sparepart Call

React/Vite dashboard with Vercel Functions. Google Sheets remains the source of truth; same-origin API functions combine data requests and cache the combined response at the hosting platform's edge.

## Deploy with Vercel

1. Import this repository in the Vercel dashboard.
2. Vercel uses `vercel.json` to build the Vite app into `dist` and deploy the functions in `api/`.
3. Add these environment variables under **Project Settings > Environment Variables**:
   - `NEW_PART_SAVE_URL`: the Google Apps Script `/exec` URL that handles status/project saves.
   - `OUTSIDE_REQUEST_URL`: the Google Apps Script `/exec` URL that handles outside-stock requests (optional; defaults to the current endpoint).
   - `LOGIN_LOG_URL`: the Google Apps Script `/exec` URL that accepts login events (optional).
   - `NAWA_BACKUP_URL`: the Google Apps Script `/exec` URL used as a fallback if the Nawa OpenSheet source fails (optional; defaults to the current backup endpoint).
4. Deploy. The data functions use a five-minute maximum duration, which is within the current Vercel Hobby (Free) limit of 300 seconds.

The source sheet URLs are defined in `functions/api/data.js`; the main call list comes from the `CallMaterial` sheet in the configured spreadsheet. The API returns all dashboard datasets in one request and caches the combined response at the edge for up to five minutes. The browser's IndexedDB cache remains available as a fallback.

## Local development

Run `npm install`, authenticate with `npx vercel login`, and link the Vercel project with `npx vercel link`. Then use `npx vercel dev` to test the app and API functions locally. Add the endpoint URLs to `.env.local` for local write testing; keep that file out of Git.

## Important security note

The existing employee password rule (the last four digits of the employee ID) is retained for compatibility; it is not suitable for strong authentication. The login endpoint only preserves the current UI gate and does not provide authorization for the publicly available sheet data or write endpoints. Protect the app and write APIs with Vercel deployment protection or implement real authentication before treating the dashboard as a secure system. Do not put Apps Script endpoint URLs in frontend code; configure them as Vercel environment variables.
