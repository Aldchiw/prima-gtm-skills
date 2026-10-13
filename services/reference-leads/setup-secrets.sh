#!/usr/bin/env bash
# Create secrets in GCP Secret Manager (run once, manually).
# Fill in the values when prompted — never paste them in plain text.

set -euo pipefail

PROJECT="zadrac-tests"

echo "=== Creating secret: anthropic-api-key ==="
echo -n "Paste your Anthropic API key: "
read -rs ANTHROPIC_KEY
echo
printf '%s' "${ANTHROPIC_KEY}" | gcloud secrets create anthropic-api-key \
  --data-file=- \
  --project "${PROJECT}" \
  --replication-policy automatic || \
gcloud secrets versions add anthropic-api-key \
  --data-file=<(printf '%s' "${ANTHROPIC_KEY}") \
  --project "${PROJECT}"

echo "=== Creating secret: github-token-reference-leads ==="
echo -n "Paste your GitHub token (ghp_...): "
read -rs GITHUB_TOKEN
echo
printf '%s' "${GITHUB_TOKEN}" | gcloud secrets create github-token-reference-leads \
  --data-file=- \
  --project "${PROJECT}" \
  --replication-policy automatic || \
gcloud secrets versions add github-token-reference-leads \
  --data-file=<(printf '%s' "${GITHUB_TOKEN}") \
  --project "${PROJECT}"

echo "=== Secrets created. Granting Cloud Run SA access... ==="
PROJECT_NUMBER=$(gcloud projects describe "${PROJECT}" --format="value(projectNumber)")
SA="service-${PROJECT_NUMBER}@serverless-robot-prod.iam.gserviceaccount.com"

for SECRET in anthropic-api-key github-token-reference-leads; do
  gcloud secrets add-iam-policy-binding "${SECRET}" \
    --member="serviceAccount:${SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --project "${PROJECT}"
done

echo "=== Done. Run deploy.sh next. ==="
