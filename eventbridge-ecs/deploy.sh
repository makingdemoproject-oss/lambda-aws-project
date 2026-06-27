#!/bin/bash
set -e
STACK_NAME="eventbridge-ecs-production"
CODE_BUCKET="express-deploy-202606232329"
CODE_KEY="eventbridge-ecs-lambdas.zip"
REGION="ap-south-1"

echo ">>> Zipping Lambda functions..."
cd src
zip -r "../${CODE_KEY}" . -x "*.zip"
cd ..

echo ">>> Uploading to S3..."
aws s3 cp "${CODE_KEY}" "s3://${CODE_BUCKET}/${CODE_KEY}" --region "${REGION}"

echo ">>> Deploying CloudFormation..."
aws cloudformation deploy \
  --template-file cloudformation.yaml \
  --stack-name "${STACK_NAME}" \
  --parameter-overrides CodeBucket="${CODE_BUCKET}" CodeKey="${CODE_KEY}" \
  --capabilities CAPABILITY_NAMED_IAM \
  --region "${REGION}"

echo ">>> Outputs:"
aws cloudformation describe-stacks --stack-name "${STACK_NAME}" \
  --region "${REGION}" \
  --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
  --output table
