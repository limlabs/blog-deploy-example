stackName=$1

if [ -z "$stackName" ]; then
  echo "Please provide the stack name"
  exit 1
fi

instanceId=$(cd pulumi/foundation && pulumi stack output --stack $stackName | grep -E 'bastionInstanceId' | awk '{print $2}')
dbEndpoint=$(cd pulumi/foundation && pulumi stack output --stack $stackName | grep -E 'dbEndpoint' | awk '{print $2}')
json='{"host":["'$dbEndpoint'"],"portNumber":["5432"],"localPortNumber":["5432"]}'
aws ssm start-session --target $instanceId --document-name AWS-StartPortForwardingSessionToRemoteHost --parameters $json
