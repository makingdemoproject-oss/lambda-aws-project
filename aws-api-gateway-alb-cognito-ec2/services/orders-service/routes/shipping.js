const router = require('express').Router();
const c = require('../controllers/shippingController');

router.get('/',                   c.getAll);
router.get('/order/:orderId',     c.getByOrder);
router.post('/',                  c.create);
router.get('/track/:trackingId',  c.track);
router.put('/:id/status',         c.updateStatus);

module.exports = router;
