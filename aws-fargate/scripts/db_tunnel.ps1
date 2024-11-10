param (
  [string]$stackName
)

if (-not $stackName) {
  Write-Host "Please provide the stack name"
  exit 1
}

Set-Location -Path pulumi/foundation
$instanceId = (pulumi stack output --stack $stackName | Select-String -Pattern 'bastionInstanceId').Line.Split()[-1]
$dbEndpoint = (pulumi stack output --stack $stackName | Select-String -Pattern 'dbEndpoint').Line.Split()[-1]
Set-Location -Path ../..

if (-not $instanceId) {
    Write-Error "Instance ID is empty"
    exit 1
}

if (-not $dbEndpoint) {
    Write-Error "DB Endpoint is empty"
    exit 1
}

$json = @{
  host = @($dbEndpoint)
  portNumber = @("5432")
  localPortNumber = @("5432")
} | ConvertTo-Json

aws ssm start-session --target $instanceId --document-name AWS-StartPortForwardingSessionToRemoteHost --parameters $json
