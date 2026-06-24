module.exports = {
  ok:      (res, data=null, message='OK',      meta) => res.status(200).json({ success: true, message, data, meta }),
  created: (res, data=null, message='Created', meta) => res.status(201).json({ success: true, message, data, meta }),
};
