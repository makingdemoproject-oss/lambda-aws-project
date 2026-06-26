#!/bin/bash
set -e

STACK_NAME="s3-sqs-lambda-dynamodb-production"
CODE_BUCKET="express-deploy-202606232329"
CODE_KEY="s3-sqs-lambda-dynamodb.zip"
REGION="ap-south-1"

echo ">>> Installing dependencies..."
cd src
npm install
cd ..

echo ">>> Zipping Lambda code..."
cd src
zip -r "../${CODE_KEY}" . -x "*.zip"
cd ..

echo ">>> Uploading code to S3..."
aws s3 cp "${CODE_KEY}" "s3://${CODE_BUCKET}/${CODE_KEY}" --region "${REGION}"

echo ">>> Deploying CloudFormation stack..."
aws cloudformation deploy \
  --template-file cloudformation.yaml \
  --stack-name "${STACK_NAME}" \
  --parameter-overrides CodeBucket="${CODE_BUCKET}" CodeKey="${CODE_KEY}" \
  --capabilities CAPABILITY_NAMED_IAM \
  --region "${REGION}"

echo ""
echo ">>> Stack outputs:"
aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --region "${REGION}" \
  --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
  --output table
