const router = require('express').Router();
const c = require('../controllers/trackingController');

router.get('/history',          c.getHistory);
router.get('/order/:orderId',   c.getByOrder);
router.post('/order/:orderId',  c.addEvent);
router.get('/live/:orderId',    c.getLive);
router.get('/eta/:orderId',     c.getETA);

module.exports = router;
