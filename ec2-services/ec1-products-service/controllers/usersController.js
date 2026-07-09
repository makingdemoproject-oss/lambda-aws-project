const users = [
  { id: 'u1', name: 'Ranjan', email: 'ranjan@test.com', role: 'admin',  status: 'active'   },
  { id: 'u2', name: 'Demo',   email: 'demo@test.com',   role: 'user',   status: 'active'   },
  { id: 'u3', name: 'Test',   email: 'test@test.com',   role: 'viewer', status: 'inactive' },
];

exports.getAll    = (req, res) => res.json({ success: true, count: users.length, data: users });
exports.getById   = (req, res) => {
  const u = users.find(x => x.id === req.params.id);
  return u ? res.json({ success: true, data: u }) : res.status(404).json({ success: false, message: 'Not found' });
};
exports.create    = (req, res) => {
  const u = { id: 'u' + Date.now(), ...req.body, createdAt: new Date().toISOString() };
  users.push(u);
  res.status(201).json({ success: true, data: u });
};
exports.update    = (req, res) => res.json({ success: true, data: { id: req.params.id, ...req.body } });
exports.getByRole = (req, res) => res.json({ success: true, data: users.filter(u => u.role === req.params.role) });
