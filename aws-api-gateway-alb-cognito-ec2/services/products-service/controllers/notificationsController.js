const { publishToSNS } = require('../lib/sns');
const { sendToSQS } = require('../lib/sqs');

const notifications = [
  { id: 'N001', type: 'email', recipient: 'demo@test.com', message: 'Order placed',   status: 'sent'    },
  { id: 'N002', type: 'sms',   recipient: '+919999999999', message: 'Payment success', status: 'sent'    },
  { id: 'N003', type: 'push',  recipient: 'u1',            message: 'Item shipped',    status: 'pending' },
];

exports.getAll  = (req, res) => res.json({ success: true, count: notifications.length, data: notifications });
exports.send    = async (req, res) => {
  const notif = { id: 'N' + Date.now(), ...req.body, sentAt: new Date().toISOString(), status: 'processing' };
  await publishToSNS('notification-sent', notif);
  await sendToSQS('notification-queue', notif);
  notifications.push(notif);
  res.status(201).json({ success: true, data: notif, queued: true });
};
exports.getByType  = (req, res) => res.json({ success: true, data: notifications.filter(n => n.type === req.params.type) });
exports.getByUser  = (req, res) => res.json({ success: true, data: notifications.filter(n => n.recipient === req.params.uid) });
exports.markRead   = (req, res) => res.json({ success: true, data: { id: req.params.id, read: true, readAt: new Date().toISOString() } });
