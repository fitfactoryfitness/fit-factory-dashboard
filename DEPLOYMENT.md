# Deployment (future — not yet enabled)

This app is currently local-only. Before deploying to a screen/TV, add access control — a secret URL slug and `noindex` are NOT security.

## SEO / discoverability protection (already implemented)

- `robots` metadata (`noindex, nofollow, noarchive, nosnippet`) is set in `src/app/layout.tsx`.
- `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` header is added to every response in `next.config.js`.
- Do not link to the deployed URL from the public website or sitemap.

## Option A (preferred): Cloudflare Access

1. Deploy the app (e.g., Vercel or any Node host) behind `dashboard.fitfactoryfitness.com`.
2. Put the subdomain behind Cloudflare, enable Cloudflare Access (Zero Trust).
3. Create an Access application scoped to that subdomain/path.
4. Set the policy to allow only specific approved emails or the company Google Workspace/Microsoft 365 domain.
5. For the AbleSign display device: use a long-lived Access service token or a dedicated approved account signed in once on that device, since Access sessions can be kept alive for kiosk-style continuous display.

## Option B: Vercel/middleware authentication

1. Implement Next.js middleware that checks a signed session cookie or JWT.
2. Maintain an allowlist of approved emails (env var or small config file).
3. Use an OAuth provider (Google) for interactive login, then persist a long session for the kiosk device.

## Option C (temporary/basic): HTTP Basic Auth

1. Add middleware that checks a `Basic` auth header against a single shared username/password stored in environment variables.
2. Acceptable only as a stopgap — rotate the credential periodically and switch to Option A/B when possible.

## For all options

- Serve over HTTPS only.
- Keep Google service-account credentials server-side only (never in client bundles) — already enforced: `src/lib/googleSheets/client.ts` is only ever imported from server code (`src/data/provider.ts`'s `GoogleSheetsProvider`, used from the API route and the server-rendered page).
- Exclude the route from any sitemap and don't link to it publicly.
- Confirm the AbleSign player can either maintain an authenticated session (cookie-based) or use a device-specific access token, depending on which option is chosen.

## Switching to live Google Sheets data

1. Set `DASHBOARD_DATA_SOURCE=google` in the deployment environment.
2. Set `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` (see README for setup steps).
3. Confirm the service account has been granted Viewer access to the spreadsheet.

## Changing the spreadsheet for a new year

Update `GOOGLE_SHEETS_SPREADSHEET_ID` to the new workbook's ID. No code changes are required as long as the new workbook follows the same three-letter month tab naming convention.
