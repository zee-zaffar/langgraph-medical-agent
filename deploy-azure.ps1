## Azure Deployment Script for langraph_medical_agent
## Run as: pwsh -File deploy-azure.ps1

# Note: Do NOT set $ErrorActionPreference = "Stop" globally — az warnings to stderr
# would be misinterpreted as terminating errors by PowerShell.

# ── Refresh PATH so 'az' is found ──────────────────────────────────────────
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("PATH","User")

# ── Config ─────────────────────────────────────────────────────────────────
$RG          = "medical-agent"
$LOCATION    = "eastus"
$ACR         = "medicalagentacr"
$DB_SERVER   = "medical-agent-pg"
$DB_USER     = "agent"
$DB_PASS     = "AgentPass123!"          # must meet Azure complexity rules
$DB_NAME     = "agentdb"
$ACA_ENV     = "medical-agent-env"
$PROJECT_DIR = "C:\projects\langraph_medical_agent"

$OPENAI_KEY  = (Get-Content "$PROJECT_DIR\backend\.env" |
                Where-Object { $_ -match "^OPENAI_API_KEY=" } |
                ForEach-Object { $_ -replace "^OPENAI_API_KEY=", "" }).Trim()

$OPENAI_MODEL = "gpt-4o"

Write-Host "`n=== Step 1: Ensure resource group ===" -ForegroundColor Cyan
az group create --name $RG --location $LOCATION --output table

Write-Host "`n=== Step 2: Register resource providers ===" -ForegroundColor Cyan
az provider register --namespace Microsoft.ContainerRegistry
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.DBforPostgreSQL
az provider register --namespace Microsoft.OperationalInsights

# Wait until all are registered
foreach ($ns in @("Microsoft.ContainerRegistry","Microsoft.App","Microsoft.DBforPostgreSQL","Microsoft.OperationalInsights")) {
    Write-Host "  Waiting for $ns ..." -NoNewline
    do {
        Start-Sleep -Seconds 5
        $state = az provider show --namespace $ns --query registrationState -o tsv 2>&1
        Write-Host "." -NoNewline
    } while ($state -ne "Registered")
    Write-Host " Registered"
}

Write-Host "`n=== Step 3: Create Azure Container Registry ===" -ForegroundColor Cyan
az acr create --name $ACR --resource-group $RG --sku Basic --admin-enabled true --output table

$ACR_LOGIN_SERVER = az acr show --name $ACR --resource-group $RG --query loginServer -o tsv
$ACR_USERNAME     = az acr credential show --name $ACR --query username -o tsv
$ACR_PASSWORD     = az acr credential show --name $ACR --query "passwords[0].value" -o tsv

Write-Host "ACR: $ACR_LOGIN_SERVER"

Write-Host "`n=== Step 4: Build & push backend image ===" -ForegroundColor Cyan
Set-Location "$PROJECT_DIR\backend"
docker build -t "${ACR_LOGIN_SERVER}/medical-backend:latest" .
docker login $ACR_LOGIN_SERVER -u $ACR_USERNAME -p $ACR_PASSWORD
docker push "${ACR_LOGIN_SERVER}/medical-backend:latest"

Write-Host "`n=== Step 5: Create PostgreSQL Flexible Server ===" -ForegroundColor Cyan
az postgres flexible-server create `
  --name $DB_SERVER `
  --resource-group $RG `
  --location $LOCATION `
  --admin-user $DB_USER `
  --admin-password $DB_PASS `
  --sku-name Standard_B1ms `
  --tier Burstable `
  --public-access 0.0.0.0 `
  --output table

# Create the database separately (--database-name not valid for flexible-server create)
az postgres flexible-server db create `
  --server-name $DB_SERVER `
  --resource-group $RG `
  --database-name $DB_NAME `
  --output table

$DB_FQDN = az postgres flexible-server show --name $DB_SERVER --resource-group $RG --query fullyQualifiedDomainName -o tsv
$DB_URL  = "postgresql://${DB_USER}:${DB_PASS}@${DB_FQDN}:5432/${DB_NAME}?sslmode=require"
Write-Host "DB URL: $DB_URL"

Write-Host "`n=== Step 6: Create Container Apps environment ===" -ForegroundColor Cyan
az containerapp env create `
  --name $ACA_ENV `
  --resource-group $RG `
  --location $LOCATION `
  --output table

Write-Host "`n=== Step 7: Deploy backend Container App ===" -ForegroundColor Cyan
az containerapp create `
  --name medical-backend `
  --resource-group $RG `
  --environment $ACA_ENV `
  --image "${ACR_LOGIN_SERVER}/medical-backend:latest" `
  --registry-server $ACR_LOGIN_SERVER `
  --registry-username $ACR_USERNAME `
  --registry-password $ACR_PASSWORD `
  --env-vars "OPENAI_API_KEY=$OPENAI_KEY" "OPENAI_MODEL=$OPENAI_MODEL" "DATABASE_URL=$DB_URL" "PORT=8000" `
  --target-port 8000 `
  --ingress external `
  --min-replicas 1 `
  --max-replicas 3 `
  --cpu 0.5 `
  --memory 1.0Gi `
  --output table

$BACKEND_FQDN = az containerapp show --name medical-backend --resource-group $RG --query "properties.configuration.ingress.fqdn" -o tsv
$BACKEND_URL  = "https://$BACKEND_FQDN"
Write-Host "Backend URL: $BACKEND_URL"

Write-Host "`n=== Step 8: Build & push frontend image with correct API URL ===" -ForegroundColor Cyan
Set-Location "$PROJECT_DIR\frontend"
docker build --build-arg "NEXT_PUBLIC_API_URL=$BACKEND_URL" -t "${ACR_LOGIN_SERVER}/medical-frontend:latest" .
docker push "${ACR_LOGIN_SERVER}/medical-frontend:latest"

Write-Host "`n=== Step 9: Deploy frontend Container App ===" -ForegroundColor Cyan
az containerapp create `
  --name medical-frontend `
  --resource-group $RG `
  --environment $ACA_ENV `
  --image "${ACR_LOGIN_SERVER}/medical-frontend:latest" `
  --registry-server $ACR_LOGIN_SERVER `
  --registry-username $ACR_USERNAME `
  --registry-password $ACR_PASSWORD `
  --env-vars "PORT=3000" "NEXT_PUBLIC_API_URL=$BACKEND_URL" `
  --target-port 3000 `
  --ingress external `
  --min-replicas 1 `
  --max-replicas 2 `
  --cpu 0.5 `
  --memory 1.0Gi `
  --output table

$FRONTEND_FQDN = az containerapp show --name medical-frontend --resource-group $RG --query "properties.configuration.ingress.fqdn" -o tsv

Write-Host "`n============================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host "Frontend:  https://$FRONTEND_FQDN" -ForegroundColor Yellow
Write-Host "Backend:   $BACKEND_URL" -ForegroundColor Yellow
Write-Host "Resource Group: $RG (subscription: Zee Azure Sandbox Subscription)" -ForegroundColor Yellow
