const router = require('express').Router();
const c = require('../controllers/paymentsController');

router.get('/',              c.getAll);
router.get('/:id',           c.getById);
router.post('/',             c.initiate);
router.post('/:id/refund',   c.refund);
router.get('/method/:method',c.getByMethod);

module.exports = router;
