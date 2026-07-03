# Encyclopediae

## Cloudflare Deployment (GitHub Actions)

This repo includes a workflow at `.github/workflows/deploy-cloudflare.yml` that deploys the Worker defined in `wrangler.toml` under `env.signup`.

### Required GitHub Secrets

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The API token needs permission to deploy Workers and edit routes for this zone.

### Triggers

- Push to `main` when files in `signup-worker/**` or `wrangler.toml` change.
- Manual run from the Actions tab via `workflow_dispatch`.
