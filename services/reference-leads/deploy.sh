#!/usr/bin/env bash
# Deploy reference-leads service to Cloud Run (zadrac-tests)
# Run once: bash services/reference-leads/deploy.sh
# Requires: gcloud CLI authenticated, secrets already created in Secret Manager.

set -euo pipefail

PROJECT="zadrac-tests"
REGION="us-central1"
SERVICE="reference-leads"
IMAGE="gcr.io/${PROJECT}/${SERVICE}"

echo "=== Building and pushing image ==="
gcloud builds submit services/reference-leads \
  --tag "${IMAGE}" \
  --project "${PROJECT}"

echo "=== Deploying to Cloud Run ==="
gcloud run deploy "${SERVICE}" \
  --image "${IMAGE}" \
  --platform managed \
  --region "${REGION}" \
  --project "${PROJECT}" \
  --no-allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --set-secrets "ANTHROPIC_API_KEY=anthropic-api-key:latest,GITHUB_TOKEN=github-token-reference-leads:latest" \
  --set-env-vars "GITHUB_REPO=Aldchiw/prima-gtm-skills,GITHUB_BRANCH=main"

echo "=== Done ==="
gcloud run services describe "${SERVICE}" \
  --region "${REGION}" \
  --project "${PROJECT}" \
  --format "value(status.url)"
