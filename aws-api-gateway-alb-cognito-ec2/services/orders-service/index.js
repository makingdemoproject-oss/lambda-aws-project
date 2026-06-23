const express = require('express');
const cors    = require('cors');
const os      = require('os');

const app  = express();
const PORT = process.env.PORT || 3002;
const HOST = os.hostname();

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Authorization','Content-Type'] }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'orders-service', host: HOST, port: PORT }));

// 5 services — each with 5 routes
app.use('/api/orders/orders',    require('./routes/orders'));
app.use('/api/orders/shipping',  require('./routes/shipping'));
app.use('/api/orders/warehouse', require('./routes/warehouse'));
app.use('/api/orders/dispatch',  require('./routes/dispatch'));
app.use('/api/orders/tracking',  require('./routes/tracking'));

app.listen(PORT, () => console.log(`orders-service on port ${PORT} (${HOST})`));
