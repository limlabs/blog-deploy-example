#!/bin/bash

stackName=$1

if [ -z "$stackName" ]; then
  echo "Please provide the stack name"
  exit 1
fi

secretArn=$(cd pulumi && pulumi stack output | grep -E 'connectionStringArn' | awk '{print $2}')
connectionString=$(aws secretsmanager get-secret-value --secret-id $secretArn --query SecretString --output text)

# Replace or append the connectionString as POSTGRES_PRISMA_URL in .env.${stackName}
envFile=".env.${stackName}"

if grep -q "POSTGRES_PRISMA_URL" "$envFile"; then
  sed -i '' "s|^POSTGRES_PRISMA_URL=.*|POSTGRES_PRISMA_URL=${connectionString}|" "$envFile"
else
  echo "POSTGRES_PRISMA_URL=${connectionString}" >> "$envFile"
fi
