# Encyclopediae

## Cloudflare Deployment (GitHub Actions)

This repo includes a workflow at `.github/workflows/deploy-cloudflare.yml` that deploys the Worker defined in `wrangler.toml` under `env.signup`.

### Required GitHub Secrets

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The API token must include all of these permissions:

- Account: `Workers Scripts:Edit`
- Account: `Workers KV Storage:Edit` (for KV bindings used by this Worker)
- Zone: `Workers Routes:Edit` (if deploying/updating routes from `wrangler.toml`)
- Zone: `Zone:Read`

And scope it to:

- The exact account in `CLOUDFLARE_ACCOUNT_ID`
- The exact zone `encyclopediae.org`

### Triggers

- Push to `main` when files in `signup-worker/**` or `wrangler.toml` change.
- Manual run from the Actions tab via `workflow_dispatch`.

## Local Dev Secrets Template

Use `.dev.vars.example` as a template for local Worker secrets:

1. Copy `.dev.vars.example` to `.dev.vars`
2. Fill in your real `TURNSTILE_SECRET_KEY`

`.dev.vars` is gitignored and should never be committed.

## Local Deploy Auth Template

Use `.env.example` as a template for local deploy auth variables:

1. Copy `.env.example` to `.env`
2. Fill in your real `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
3. Run `npm run deploy:signup`

`.env` is gitignored and should never be committed.
