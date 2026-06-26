const router = require('express').Router();
const c = require('../controllers/inventoryController');

router.get('/',                    c.getAll);
router.get('/product/:productId',  c.getByProduct);
router.post('/reserve',            c.reserve);
router.post('/release/:productId', c.release);
router.get('/warehouse/:wh',       c.getByWarehouse);

module.exports = router;
