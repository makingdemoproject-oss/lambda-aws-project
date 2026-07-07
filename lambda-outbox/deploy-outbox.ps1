# deploy-outbox.ps1 — Build, upload, deploy Outbox Pattern CloudFormation stack
# Run from lambda-auth-rds/ folder
# Same pattern as deploy.ps1 (lambda-auth-rds-stack)

param(
  [string]$S3Bucket  = "express-deploy-202606232329",
  [string]$Region    = "ap-south-1",
  [string]$DBPass    = "SecurePass2024#Prod",
  [string]$StackName = "lambda-outbox-stack"
)

$ErrorActionPreference = "Stop"
$S3Key = "lambda-auth-rds/lambda-auth-rds.zip"

Write-Host "=== Step 1: npm install ===" -ForegroundColor Cyan
npm install

# Install AWS SDK v3 for DynamoDB (needed by outbox.js / outbox-worker.js)
Write-Host "=== Step 1b: Install @aws-sdk/client-dynamodb ===" -ForegroundColor Cyan
npm install @aws-sdk/client-dynamodb @aws-sdk/util-dynamodb

Write-Host "=== Step 2: Creating zip (src + node_modules) ===" -ForegroundColor Cyan
if (Test-Path "lambda-auth-rds.zip") { Remove-Item "lambda-auth-rds.zip" }
Compress-Archive -Path "src","node_modules","package.json" -DestinationPath "lambda-auth-rds.zip"

Write-Host "=== Step 3: Upload zip to S3 ===" -ForegroundColor Cyan
aws s3 cp lambda-auth-rds.zip "s3://$S3Bucket/$S3Key" --region $Region

Write-Host "=== Step 4: Deploy CloudFormation stack ===" -ForegroundColor Cyan
aws cloudformation deploy `
  --template-file outbox-cloudformation.yaml `
  --stack-name $StackName `
  --region $Region `
  --capabilities CAPABILITY_NAMED_IAM `
  --parameter-overrides `
    S3Bucket=$S3Bucket `
    S3Key=$S3Key `
    DBPassword=$DBPass

Write-Host "=== Step 5: Stack outputs ===" -ForegroundColor Cyan
aws cloudformation describe-stacks `
  --stack-name $StackName `
  --region $Region `
  --query "Stacks[0].Outputs" `
  --output table

Write-Host ""
Write-Host "DONE! Test karo:" -ForegroundColor Green
Write-Host "  POST https://ixthoe12fe.execute-api.$Region.amazonaws.com/prod/outbox/orders"
Write-Host "       Body: {orderId, customerId, productId, quantity, amount}"
Write-Host "  GET  https://ixthoe12fe.execute-api.$Region.amazonaws.com/prod/outbox/events"
Write-Host "  POST https://ixthoe12fe.execute-api.$Region.amazonaws.com/prod/outbox/process"
Write-Host "  GET  https://ixthoe12fe.execute-api.$Region.amazonaws.com/prod/outbox/dynamodb"
Write-Host ""
Write-Host "EventBridge rule 'outbox-worker-every-1min' bhi active ho gaya." -ForegroundColor Yellow
Write-Host "RDS start karna mat bhoolna: aws rds start-db-instance --db-instance-identifier postgres-production --region ap-south-1" -ForegroundColor Red
