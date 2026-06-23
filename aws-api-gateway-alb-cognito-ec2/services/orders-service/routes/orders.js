const router = require('express').Router();
const c = require('../controllers/ordersController');

router.get('/',          c.getAll);
router.get('/:id',       c.getById);
router.post('/',         c.create);
router.put('/:id/status',c.updateStatus);
router.delete('/:id',    c.cancel);

module.exports = router;
