const express = require('express');
const cors    = require('cors');
const os      = require('os');

const app  = express();
const PORT = process.env.PORT || 3002;
const HOST = os.hostname();
const PRIVATE_IP = Object.values(os.networkInterfaces()).flat().find(n => n.family === 'IPv4' && !n.internal)?.address || 'unknown';

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Authorization','Content-Type'] }));
app.use(express.json());

// Inject EC2 server info into every JSON response
app.use((req, res, next) => {
  const _json = res.json.bind(res);
  res.json = (body) => {
    if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
      body._server = { ec2: 'EC2-3 (order-processing-ec2-production)', service: 'orders-service', host: HOST, privateIp: PRIVATE_IP, port: PORT, path: req.path };
    }
    return _json(body);
  };
  next();
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'orders-service', host: HOST, privateIp: PRIVATE_IP, port: PORT }));

// 5 services — each with 5 routes
app.use('/api/orders/orders',    require('./routes/orders'));
app.use('/api/orders/shipping',  require('./routes/shipping'));
app.use('/api/orders/warehouse', require('./routes/warehouse'));
app.use('/api/orders/dispatch',  require('./routes/dispatch'));
app.use('/api/orders/tracking',  require('./routes/tracking'));

app.listen(PORT, () => console.log(`orders-service on port ${PORT} (${HOST})`));
