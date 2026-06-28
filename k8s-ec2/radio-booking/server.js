const express = require('express');
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', '*');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const bookings = [
  { id: 1, station: 'Radio Mirchi 98.3', slot: '09:00-09:30', advertiser: 'Pepsi',  status: 'confirmed' },
  { id: 2, station: 'Big FM 92.7',       slot: '12:00-12:15', advertiser: 'Maggi',  status: 'pending'   },
  { id: 3, station: 'Red FM 93.5',       slot: '18:00-18:30', advertiser: 'Airtel', status: 'confirmed' },
];

app.get('/health', (req, res) => res.json({
  status: 'healthy',
  service: 'radio-booking-api',
  version: 'v1',
  image: 'ECR → k3s Kubernetes',
  pod: process.env.HOSTNAME || 'unknown',
  uptime: Math.floor(process.uptime()) + 's',
}));

app.get('/bookings', (req, res) => {
  const { status } = req.query;
  const list = status ? bookings.filter(b => b.status === status) : bookings;
  res.json({ bookings: list, total: list.length, servedBy: 'Pod: ' + process.env.HOSTNAME });
});

app.post('/bookings', (req, res) => {
  const { station, slot, advertiser } = req.body;
  if (!station || !slot || !advertiser)
    return res.status(400).json({ error: 'station, slot, advertiser required' });
  const b = { id: bookings.length + 1, station, slot, advertiser, status: 'pending' };
  bookings.push(b);
  res.status(201).json({ message: 'Booking created', booking: b });
});

app.get('/bookings/:id', (req, res) => {
  const b = bookings.find(x => x.id === parseInt(req.params.id));
  b ? res.json(b) : res.status(404).json({ error: 'Booking not found' });
});

app.listen(5000, () => console.log('radio-booking-api running on port 5000'));
