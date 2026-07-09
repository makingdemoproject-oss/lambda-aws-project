const express = require('express');
const cors    = require('cors');
const os      = require('os');

const app  = express();
const PORT = process.env.PORT || 3001;
const HOST = os.hostname();
const PRIVATE_IP = Object.values(os.networkInterfaces()).flat().find(n => n.family === 'IPv4' && !n.internal)?.address || 'unknown';

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Authorization','Content-Type'] }));
app.use(express.json());

// Inject EC2 server info into every JSON response
app.use((req, res, next) => {
  const _json = res.json.bind(res);
  res.json = (body) => {
    if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
      body._server = { ec2: 'EC2-1 (express-service-production)', service: 'products-service', host: HOST, privateIp: PRIVATE_IP, port: PORT, path: req.path };
    }
    return _json(body);
  };
  next();
});

// Health
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'products-service', host: HOST, privateIp: PRIVATE_IP, port: PORT }));

// Auth (mock — for Cognito VerifyAuthChallenge Lambda)
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ success: false });
  const p = Buffer.from(JSON.stringify({ sub: email, iat: Date.now() })).toString('base64');
  res.json({ success: true, token: `${p}.${p}.sig`, user: { email, role: 'admin' } });
});
app.post('/api/v1/auth/register', (req, res) => {
  const { email, firstName } = req.body || {};
  res.status(201).json({ success: true, user: { email, firstName, id: Date.now() } });
});

// Service routes — each has 5 sub-routes (see routes/)
app.use('/api/app/products',      require('./routes/products'));
app.use('/api/app/users',         require('./routes/users'));
app.use('/api/app/payments',      require('./routes/payments'));
app.use('/api/app/inventory',     require('./routes/inventory'));
app.use('/api/app/notifications', require('./routes/notifications'));

app.listen(PORT, () => console.log(`products-service on port ${PORT} (${HOST})`));
