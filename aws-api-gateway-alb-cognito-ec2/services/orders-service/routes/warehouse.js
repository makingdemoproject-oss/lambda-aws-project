const router = require('express').Router();
const c = require('../controllers/warehouseController');

router.get('/',           c.getAll);
router.get('/stats',      c.getStats);
router.get('/:id',        c.getById);
router.get('/:id/stock',  c.getStock);
router.post('/transfer',  c.transfer);

module.exports = router;
