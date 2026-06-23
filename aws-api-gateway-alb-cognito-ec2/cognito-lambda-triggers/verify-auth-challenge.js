// Trigger 3: VerifyAuthChallengeResponse
// Sabse zaroori trigger — client ka answer validate karta hai
//
// Flow:
//   Client → RespondToAuthChallenge(ANSWER: JSON.stringify({email, password}))
//   Yahan Lambda → RBAC EC2 /api/auth/login POST karta hai
//   RBAC service → PostgreSQL se credentials verify karta hai
//   answerCorrect: true/false → back to DefineAuthChallenge

const http = require('http');

const RBAC_API_URL = process.env.RBAC_API_URL || 'http://172.31.33.6:3000';

exports.handler = async (event) => {
  let answerCorrect = false;

  try {
    // Client ne ANSWER mein {email, password} bheja tha
    const answer = JSON.parse(event.request.challengeAnswer);
    const { email, password } = answer;

    // RBAC EC2 pe call karo (private IP — same VPC)
    const result = await callRbacService(email, password);
    answerCorrect = result.success === true;

    console.log(`RBAC verify for ${email}: ${answerCorrect ? 'SUCCESS' : 'FAILED'}`);
  } catch (err) {
    console.error('VerifyAuthChallenge error:', err.message);
    answerCorrect = false;
  }

  event.response.answerCorrect = answerCorrect;
  return event;
};

function callRbacService(email, password) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ email, password });
    const [hostname, port] = RBAC_API_URL.replace('http://', '').split(':');

    const options = {
      hostname,
      port: parseInt(port) || 3000,
      path: '/api/auth/login',      // nginx proxy → port 4000 → PostgreSQL check
      method: 'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 10000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ success: res.statusCode === 200 && parsed.success !== false });
        } catch {
          resolve({ success: res.statusCode === 200 });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('RBAC request timeout')); });
    req.write(body);
    req.end();
  });
}
