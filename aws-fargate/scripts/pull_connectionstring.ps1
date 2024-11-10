param (
  [string]$stackName
)

if (-not $stackName) {
  Write-Host "Please provide the stack name"
  exit 1
}

Set-Location -Path pulumi/foundation
$secretArn = (pulumi stack output | Select-String -Pattern 'connectionStringArn').Line.Split()[-1]
Set-Location -Path ../..

$connectionString = (aws secretsmanager get-secret-value --secret-id $secretArn --query SecretString --output text)

# Replace the hostname with localhost so it works with the tunnel
$connectionString = $connectionString -replace '@.*?:', '@127.0.0.1:'

# Replace or append the connectionString as POSTGRES_PRISMA_URL in .env.${stackName}
$envFile = ".env.$stackName"

if (Test-Path $envFile) {
  $envContent = Get-Content $envFile
  if ($envContent -match 'POSTGRES_PRISMA_URL') {
    $envContent = $envContent -replace 'POSTGRES_PRISMA_URL=.*', "POSTGRES_PRISMA_URL=$connectionString"
  } else {
    $envContent += "`nPOSTGRES_PRISMA_URL=$connectionString"
  }
  $envContent | Set-Content $envFile
} else {
  "POSTGRES_PRISMA_URL=$connectionString" | Out-File $envFile
}