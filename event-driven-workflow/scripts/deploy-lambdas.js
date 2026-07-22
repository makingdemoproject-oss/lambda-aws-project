/**
 * Deploy Lambda functions to S3, then update CloudFormation stack.
 * Usage: node scripts/deploy-lambdas.js
 */
require('dotenv').config({ path: '../backend/.env' });
const { execSync } = require('child_process');
const { S3Client, PutObjectCommand, CreateBucketCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const { CloudFormationClient, UpdateStackCommand, CreateStackCommand, DescribeStacksCommand } = require('@aws-sdk/client-cloudformation');
const fs = require('fs');
const path = require('path');

const REGION = process.env.AWS_REGION || 'ap-south-1';
const BUCKET = process.env.LAMBDA_CODE_BUCKET || 'event-workflow-lambda-code';
const STACK_NAME = 'event-driven-workflow-dev';

const s3 = new S3Client({ region: REGION });
const cf = new CloudFormationClient({ region: REGION });

const ROOT = path.join(__dirname, '..');
const LAMBDAS = [
  { name: 'lambda1-processor', dir: 'lambdas/lambda1-processor', key: 'lambda1-processor.zip' },
  { name: 'lambda2-email',     dir: 'lambdas/lambda2-email',     key: 'lambda2-email.zip'     },
  { name: 'lambda3-analytics', dir: 'lambdas/lambda3-analytics', key: 'lambda3-analytics.zip' },
];

async function ensureBucket() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
    console.log(`✓ Bucket ${BUCKET} exists`);
  } catch {
    console.log(`Creating bucket ${BUCKET}...`);
    await s3.send(new CreateBucketCommand({
      Bucket: BUCKET,
      CreateBucketConfiguration: { LocationConstraint: REGION },
    }));
    console.log(`✓ Bucket created`);
  }
}

async function zipAndUpload(lambda) {
  const lambdaDir = path.join(ROOT, lambda.dir);
  const zipPath = path.join(ROOT, 'scripts', `${lambda.name}.zip`);

  console.log(`\nZipping ${lambda.name}...`);

  // Install dependencies
  if (fs.existsSync(path.join(lambdaDir, 'package.json'))) {
    console.log('  Installing npm packages...');
    execSync('npm install --production', { cwd: lambdaDir, stdio: 'inherit' });
  }

  // Create zip (requires zip CLI or use archiver)
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

  try {
    execSync(`powershell -Command "Compress-Archive -Path '${lambdaDir}\\*' -DestinationPath '${zipPath}' -Force"`, { stdio: 'inherit' });
  } catch {
    // Fallback: use Node archiver if available
    console.log('  PowerShell zip failed, trying direct approach...');
    const archiver = require('archiver');
    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip');
      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(lambdaDir, false);
      archive.finalize();
    });
  }

  console.log(`  Uploading ${lambda.key} to s3://${BUCKET}/...`);
  const zipBuffer = fs.readFileSync(zipPath);
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: lambda.key,
    Body: zipBuffer,
    ContentType: 'application/zip',
  }));

  console.log(`  ✓ ${lambda.name} uploaded`);
  fs.unlinkSync(zipPath);
}

async function deployStack() {
  const templatePath = path.join(ROOT, 'cloudformation', 'stack.yaml');
  const templateBody = fs.readFileSync(templatePath, 'utf8');

  const params = {
    StackName: STACK_NAME,
    TemplateBody: templateBody,
    Capabilities: ['CAPABILITY_NAMED_IAM'],
    Parameters: [
      { ParameterKey: 'Environment',       ParameterValue: 'dev' },
      { ParameterKey: 'PostgreSQLHost',    ParameterValue: process.env.PG_HOST || '13.207.251.13' },
      { ParameterKey: 'PostgreSQLPassword', ParameterValue: process.env.PG_PASSWORD || 'Lambda@1234' },
      { ParameterKey: 'SESFromEmail',      ParameterValue: process.env.SES_FROM_EMAIL || 'demo-notif-36508@yopmail.com' },
      { ParameterKey: 'LambdaCodeBucket',  ParameterValue: BUCKET },
    ],
    Tags: [{ Key: 'Project', Value: 'event-driven-workflow' }],
  };

  let stackExists = false;
  try {
    await cf.send(new DescribeStacksCommand({ StackName: STACK_NAME }));
    stackExists = true;
  } catch {}

  console.log(`\n${stackExists ? 'Updating' : 'Creating'} CloudFormation stack ${STACK_NAME}...`);
  try {
    if (stackExists) {
      await cf.send(new UpdateStackCommand(params));
    } else {
      await cf.send(new CreateStackCommand(params));
    }
    console.log(`✓ Stack ${stackExists ? 'update' : 'create'} initiated`);
    console.log(`  Monitor at: https://${REGION}.console.aws.amazon.com/cloudformation/home?region=${REGION}#/stacks`);
  } catch (err) {
    if (err.message?.includes('No updates are to be performed')) {
      console.log('✓ Stack already up to date');
    } else {
      throw err;
    }
  }
}

async function main() {
  console.log('=== Event-Driven Workflow Lambda Deployer ===');
  console.log(`Region: ${REGION} | Bucket: ${BUCKET} | Stack: ${STACK_NAME}\n`);

  await ensureBucket();

  for (const lambda of LAMBDAS) {
    await zipAndUpload(lambda);
  }

  await deployStack();

  console.log('\n✅ Deployment complete!');
  console.log('Wait ~3-5 minutes for CloudFormation to finish, then check Infrastructure page.');
}

main().catch(err => {
  console.error('Deploy failed:', err.message);
  process.exit(1);
});
