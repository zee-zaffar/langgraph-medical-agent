$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")

$ACR = "medicalagentacr.azurecr.io"
$ACR_USERNAME = az acr credential show --name medicalagentacr --query username -o tsv
$ACR_PASSWORD = az acr credential show --name medicalagentacr --query "passwords[0].value" -o tsv

Write-Host "=== Building new backend image ===" -ForegroundColor Cyan
Set-Location "C:\projects\langraph_medical_agent\backend"
docker build -t "$ACR/medical-backend:latest" .

Write-Host "`n=== Pushing to ACR ===" -ForegroundColor Cyan
docker login $ACR -u $ACR_USERNAME -p $ACR_PASSWORD
docker push "$ACR/medical-backend:latest"

Write-Host "`n=== Updating backend Container App with new image ===" -ForegroundColor Cyan
az containerapp update `
  --name medical-backend `
  --resource-group medical-agent `
  --image "$ACR/medical-backend:latest" `
  --output none

Write-Host "`n=== Waiting 90s for startup ===" -ForegroundColor Yellow
Start-Sleep -Seconds 90

Write-Host "`n=== Backend revision status ===" -ForegroundColor Cyan
az containerapp revision list `
  --name medical-backend `
  --resource-group medical-agent `
  --query "[?properties.active].{name:name,state:properties.runningState,replicas:properties.replicas}" `
  --output table

Write-Host "`n=== Testing health endpoint ===" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod "https://medical-backend.kindcliff-66a908d4.eastus.azurecontainerapps.io/health" -TimeoutSec 30
    Write-Host "HEALTHY: $($r | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "FAILED: $_" -ForegroundColor Red
}
