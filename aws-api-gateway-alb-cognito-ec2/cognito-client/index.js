// Cognito CUSTOM_AUTH flow — browser ya Node.js se use karo
// Ye token RBAC PostgreSQL se validate hokar aata hai (Cognito DB se NAHIN)
//
// Flow:
//   1. InitiateAuth(CUSTOM_AUTH, username=email)
//      → DefineAuthChallenge Lambda: session=[] → issue CUSTOM_CHALLENGE
//      → CreateAuthChallenge Lambda: challenge params banao
//   2. RespondToAuthChallenge(ANSWER: JSON.stringify({email, password}))
//      → VerifyAuthChallenge Lambda: RBAC EC2 → PostgreSQL verify
//      → DefineAuthChallenge Lambda: session[0].result=true → issueTokens=true
//   3. Cognito returns: AccessToken, IdToken, RefreshToken

const {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
} = require('@aws-sdk/client-cognito-identity-provider');

const client = new CognitoIdentityProviderClient({ region: 'ap-south-1' });

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'ap-south-1_DsHwA8dVJ';
const CLIENT_ID    = process.env.COGNITO_CLIENT_ID    || '20qlu1pvf3ev7a3hpl3l41dbrp';
const API_GW_URL   = process.env.API_GATEWAY_URL      || 'https://wxv12mu6bg.execute-api.ap-south-1.amazonaws.com/production';

// Step 1: Register user (Cognito user banao — password actually RBAC PostgreSQL mein store hoga)
async function register(email, password) {
  await client.send(new SignUpCommand({
    ClientId: CLIENT_ID,
    Username: email,
    Password: password,
    UserAttributes: [{ Name: 'email', Value: email }],
  }));
  console.log(`Registered in Cognito: ${email}`);
}

// Step 2: Login — CUSTOM_AUTH flow → Lambda → RBAC PostgreSQL
async function login(email, password) {
  // Step 2a: Auth shuru karo
  const initResp = await client.send(new InitiateAuthCommand({
    AuthFlow: 'CUSTOM_AUTH',
    ClientId: CLIENT_ID,
    AuthParameters: { USERNAME: email },
  }));

  if (initResp.ChallengeName !== 'CUSTOM_CHALLENGE') {
    throw new Error(`Unexpected challenge: ${initResp.ChallengeName}`);
  }

  // Step 2b: Password bhejo — VerifyAuthChallenge Lambda RBAC se verify karega
  const authResp = await client.send(new RespondToAuthChallengeCommand({
    ClientId:      CLIENT_ID,
    ChallengeName: 'CUSTOM_CHALLENGE',
    Session:       initResp.Session,
    ChallengeResponses: {
      USERNAME: email,
      ANSWER:   JSON.stringify({ email, password }),  // VerifyAuthChallenge Lambda parse karega
    },
  }));

  const tokens = authResp.AuthenticationResult;
  if (!tokens) throw new Error('Auth failed — check RBAC service');

  return {
    accessToken:  tokens.AccessToken,   // API Gateway ke Authorization header mein bhejo
    idToken:      tokens.IdToken,       // User info ke liye
    refreshToken: tokens.RefreshToken,  // Token refresh ke liye
    expiresIn:    tokens.ExpiresIn,     // seconds (default 3600)
  };
}

// Step 3: Protected API call (JWT token ke saath)
async function callApi(accessToken, method, path, body = null) {
  const https = require('https');
  const url = new URL(path, API_GW_URL);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,  // Cognito JWT
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Demo
(async () => {
  const EMAIL    = 'demo@test.com';
  const PASSWORD = 'Demo@12345678';

  console.log('1. Logging in (RBAC PostgreSQL se validate hoga)...');
  const tokens = await login(EMAIL, PASSWORD);
  console.log('Access Token:', tokens.accessToken.slice(0, 60) + '...');
  console.log('Expires in:', tokens.expiresIn, 'seconds');

  console.log('\n2. Protected route call — /api/app/products...');
  const products = await callApi(tokens.accessToken, 'GET', '/api/app/products');
  console.log(`Status: ${products.status}`);
  console.log(JSON.stringify(products.body, null, 2));

  console.log('\n3. Protected route call — /api/app/orders...');
  const orders = await callApi(tokens.accessToken, 'GET', '/api/app/orders');
  console.log(JSON.stringify(orders.body, null, 2));
})();
