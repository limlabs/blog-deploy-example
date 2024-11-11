#!/bin/bash

stackName=$1
if [ -z "$stackName" ]; then
  stackName="production"
fi

secretArn=$(cd pulumi && pulumi stack output --stack ${stackName} | grep -E 'connectionStringArn' | awk '{print $2}')
mediaBucketName=$(cd pulumi && pulumi stack output --stack ${stackName} | grep -E 'mediaBucketName' | awk '{print $2}')
connectionString=$(aws secretsmanager get-secret-value --secret-id $secretArn --query SecretString --output text)

# Replace or append the connectionString as POSTGRES_PRISMA_URL in .env.${stackName}
envFile=".env.${stackName}"
touch "$envFile"

update_env_var() {
  local key=$1
  local value=$2
  local file=$3

  if grep -q "$key" "$file"; then
    sed -i '' "s|^${key}=.*|${key}=${value}|" "$file"
  else
    echo "${key}=${value}" >> "$file"
  fi
}

update_env_var "POSTGRES_PRISMA_URL" "$connectionString" "$envFile"
update_env_var "MEDIA_BUCKET_NAME" "$mediaBucketName" "$envFile"
