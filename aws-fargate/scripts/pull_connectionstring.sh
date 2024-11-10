#!/bin/bash

stackName=$1

if [ -z "$stackName" ]; then
  echo "Please provide the stack name"
  exit 1
fi

secretArn=$(cd pulumi/foundation && pulumi stack output | grep -E 'connectionStringArn' | awk '{print $2}')
connectionString=$(aws secretsmanager get-secret-value --secret-id $secretArn --query SecretString --output text)

# Replace the hostname with localhost so it works with the tunnel
connectionString=$(echo $connectionString | sed 's|@.*:|@127.0.0.1:|')

# Replace or append the connectionString as POSTGRES_PRISMA_URL in .env.${stackName}
envFile=".env.${stackName}"

if grep -q "POSTGRES_PRISMA_URL" "$envFile"; then
  sed -i '' "s|^POSTGRES_PRISMA_URL=.*|POSTGRES_PRISMA_URL=${connectionString}|" "$envFile"
else
  echo "POSTGRES_PRISMA_URL=${connectionString}" >> "$envFile"
fi
