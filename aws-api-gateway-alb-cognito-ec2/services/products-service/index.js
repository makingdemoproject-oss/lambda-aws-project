const express = require('express');
const cors    = require('cors');
const os      = require('os');

const app  = express();
const PORT = process.env.PORT || 3001;
const HOST = os.hostname();

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Authorization','Content-Type'] }));
app.use(express.json());

// Health
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'products-service', host: HOST, port: PORT }));

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
