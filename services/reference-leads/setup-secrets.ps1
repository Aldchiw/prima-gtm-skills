$PROJECT = "zadrac-tests"

$ANTHROPIC_KEY = Read-Host -Prompt "Anthropic API key" -AsSecureString
$ANTHROPIC_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ANTHROPIC_KEY))

$GITHUB_TOKEN = Read-Host -Prompt "GitHub token (ghp_...)" -AsSecureString
$GITHUB_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($GITHUB_TOKEN))

$tmpA = [System.IO.Path]::GetTempFileName()
$tmpG = [System.IO.Path]::GetTempFileName()

[System.IO.File]::WriteAllText($tmpA, $ANTHROPIC_PLAIN, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText($tmpG, $GITHUB_PLAIN, [System.Text.Encoding]::UTF8)

Write-Host "=== Creating secret: anthropic-api-key ==="
gcloud secrets create anthropic-api-key --data-file=$tmpA --project $PROJECT --replication-policy automatic 2>$null
if (-not $?) {
    gcloud secrets versions add anthropic-api-key --data-file=$tmpA --project $PROJECT
}

Write-Host "=== Creating secret: github-token-reference-leads ==="
gcloud secrets create github-token-reference-leads --data-file=$tmpG --project $PROJECT --replication-policy automatic 2>$null
if (-not $?) {
    gcloud secrets versions add github-token-reference-leads --data-file=$tmpG --project $PROJECT
}

Remove-Item $tmpA, $tmpG -Force

Write-Host "=== Creating secret: reference-leads-api-key ==="
Write-Host "Inventa una API key larga, ej: rl_prima_abc123xyz789"
$API_KEY = Read-Host -Prompt "API key para el servicio" -AsSecureString
$API_KEY_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($API_KEY))
$tmpK = [System.IO.Path]::GetTempFileName()
[System.IO.File]::WriteAllText($tmpK, $API_KEY_PLAIN, [System.Text.Encoding]::UTF8)
gcloud secrets create reference-leads-api-key --data-file=$tmpK --project $PROJECT --replication-policy automatic 2>$null
if (-not $?) {
    gcloud secrets versions add reference-leads-api-key --data-file=$tmpK --project $PROJECT
}
Remove-Item $tmpK -Force
Write-Host "Guarda esa API key, la necesitaras en el cockpit."

Write-Host "=== Granting Cloud Run SA access ==="
$PROJECT_NUMBER = gcloud projects describe $PROJECT --format="value(projectNumber)"
$SA = "service-${PROJECT_NUMBER}@serverless-robot-prod.iam.gserviceaccount.com"

foreach ($SECRET in @("anthropic-api-key", "github-token-reference-leads", "reference-leads-api-key")) {
    gcloud secrets add-iam-policy-binding $SECRET `
        --member="serviceAccount:$SA" `
        --role="roles/secretmanager.secretAccessor" `
        --project $PROJECT
}

Write-Host "=== Listo. Corre deploy.ps1 ahora. ==="
