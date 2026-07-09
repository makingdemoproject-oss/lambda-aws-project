# deploy.ps1 — Build, upload to S3, deploy CloudFormation
# Run from lambda-auth-rds/ folder

param(
  [string]$S3Bucket = "express-deploy-202606232329",
  [string]$Region   = "ap-south-1",
  [string]$DBPass   = "SecurePass2024#Prod",
  [string]$JwtSecret = "lambda-rds-jwt-secret-2024-prod"
)

$ErrorActionPreference = "Stop"
$S3Key = "lambda-auth-rds/lambda-auth-rds.zip"

Write-Host "=== Step 1: npm install ===" -ForegroundColor Cyan
npm install

Write-Host "=== Step 2: Creating zip ===" -ForegroundColor Cyan
if (Test-Path "lambda-auth-rds.zip") { Remove-Item "lambda-auth-rds.zip" }
Compress-Archive -Path "src","node_modules","package.json" -DestinationPath "lambda-auth-rds.zip"

Write-Host "=== Step 3: Upload to S3 ===" -ForegroundColor Cyan
aws s3 cp lambda-auth-rds.zip "s3://$S3Bucket/$S3Key" --region $Region

Write-Host "=== Step 4: Deploy CloudFormation ===" -ForegroundColor Cyan
aws cloudformation deploy `
  --template-file cloudformation.yaml `
  --stack-name lambda-auth-rds-stack `
  --region $Region `
  --capabilities CAPABILITY_NAMED_IAM `
  --parameter-overrides `
    S3Bucket=$S3Bucket `
    S3Key=$S3Key `
    DBPassword=$DBPass `
    JwtSecret=$JwtSecret

Write-Host "=== Step 5: Get API URL ===" -ForegroundColor Cyan
aws cloudformation describe-stacks `
  --stack-name lambda-auth-rds-stack `
  --region $Region `
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" `
  --output text

Write-Host "DONE! Test karo:" -ForegroundColor Green
Write-Host "  GET  <ApiUrl>/health"
Write-Host "  POST <ApiUrl>/auth/register  {email, password, name}"
Write-Host "  POST <ApiUrl>/auth/login     {email, password}"
Write-Host "  GET  <ApiUrl>/auth/me        (Authorization: Bearer <token>)"
