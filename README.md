# Encyclopediae

## Cloudflare Deployment (GitHub Actions)

This repo includes a workflow at `.github/workflows/deploy-cloudflare.yml` that deploys the Worker defined in `wrangler.toml` under `env.signup`.

### Required GitHub Secrets

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

The API token must include all of these permissions:

- Account: `Workers Scripts:Edit`
- Account: `Workers KV Storage:Edit` (for KV bindings used by this Worker)
- Zone: `Workers Routes:Edit` (if deploying/updating routes from `wrangler.toml`)
- Zone: `Zone:Read`

And scope it to:

- The exact account in `CLOUDFLARE_ACCOUNT_ID`
- The exact zone `encyclopediae.org`

`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` should be the full `private_key` value from your Google service account JSON, including begin/end lines.

### Triggers

- Push to `main` when files in `signup-worker/**` or `wrangler.toml` change.
- Manual run from the Actions tab via `workflow_dispatch`.

## Local Dev Secrets Template

Use `.dev.vars.example` as a template for local Worker secrets:

1. Copy `.dev.vars.example` to `.dev.vars`
2. Fill in your real `TURNSTILE_SECRET_KEY`
3. Fill in your Google Sheets values:
	- `GOOGLE_SHEET_ID`
	- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
	- `GOOGLE_SHEET_RANGE` (for example `Signups!A:D`)
	- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

`.dev.vars` is gitignored and should never be committed.

## Free Signup Notification Setup (Google Sheets)

The signup worker stores submissions in KV and appends each signup to a Google Sheet.
You can then use Google notification rules on that sheet to get alerts.

1. In Google Cloud, enable the Google Sheets API for your project.
2. Create a service account and generate a JSON key.
3. Share your destination Google Sheet with the service account email as Editor.
4. Set Worker config values in `wrangler.toml`:
	- `GOOGLE_SHEET_ID`
	- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
	- `GOOGLE_SHEET_RANGE` (default `A:D`; use `SheetTab!A:D` only if that tab exists)
5. Store the private key as a Worker secret:
	- `npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY --env signup`
6. Deploy the worker:
	- `npm run deploy:signup`
7. In Google Sheets, enable notifications:
	- `Tools` -> `Notification rules`
	- Choose `Any changes are made`
	- Choose email frequency (`right away` is typical)

If Google configuration is missing, signups are still saved to KV as a fallback.

## Local Deploy Auth Template

Use `.env.example` as a template for local deploy auth variables:

1. Copy `.env.example` to `.env`
2. Fill in your real `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
3. Run `npm run deploy:signup`

`.env` is gitignored and should never be committed.
