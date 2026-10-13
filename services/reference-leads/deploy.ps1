$PROJECT = "zadrac-tests"
$REGION  = "us-central1"
$SERVICE = "reference-leads"
$IMAGE   = "gcr.io/$PROJECT/$SERVICE"

Write-Host "=== Building and pushing image ==="
gcloud builds submit services/reference-leads --tag $IMAGE --project $PROJECT

Write-Host "=== Deploying to Cloud Run ==="
gcloud run deploy $SERVICE `
    --image $IMAGE `
    --platform managed `
    --region $REGION `
    --project $PROJECT `
    --no-allow-unauthenticated `
    --memory 512Mi `
    --cpu 1 `
    --timeout 300 `
    --set-secrets "ANTHROPIC_API_KEY=anthropic-api-key:latest,GITHUB_TOKEN=github-token-reference-leads:latest" `
    --set-env-vars "GITHUB_REPO=Aldchiw/prima-gtm-skills,GITHUB_BRANCH=main"

Write-Host "=== URL del servicio ==="
gcloud run services describe $SERVICE --region $REGION --project $PROJECT --format "value(status.url)"
