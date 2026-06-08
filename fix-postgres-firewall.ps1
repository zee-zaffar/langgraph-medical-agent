$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")

Write-Host "=== Checking PostgreSQL firewall rules ===" -ForegroundColor Cyan
az postgres flexible-server firewall-rule list `
  --name medical-agent-pg `
  --resource-group medical-agent `
  --query "[].{Name:name,Start:startIpAddress,End:endIpAddress}" `
  --output table 2>&1 | Where-Object { $_ -notmatch "deprecated|repurposed|scheduled" }

Write-Host "`n=== Adding AllowAll firewall rule ===" -ForegroundColor Cyan
az postgres flexible-server firewall-rule create `
  --name medical-agent-pg `
  --resource-group medical-agent `
  --rule-name AllowAll `
  --start-ip-address 0.0.0.0 `
  --end-ip-address 255.255.255.255 `
  --output json 2>&1 | Where-Object { $_ -notmatch "deprecated|repurposed|scheduled" }

Write-Host "`n=== Firewall rules after update ===" -ForegroundColor Cyan
az postgres flexible-server firewall-rule list `
  --name medical-agent-pg `
  --resource-group medical-agent `
  --query "[].{Name:name,Start:startIpAddress,End:endIpAddress}" `
  --output table 2>&1 | Where-Object { $_ -notmatch "deprecated|repurposed|scheduled" }

Write-Host "`n=== Restarting backend Container App ===" -ForegroundColor Cyan
az containerapp revision restart `
  --name medical-backend `
  --resource-group medical-agent `
  --revision medical-backend--30dc6z6 `
  --output table

Write-Host "`n=== Waiting 60s for container to start... ===" -ForegroundColor Yellow
Start-Sleep -Seconds 60

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
