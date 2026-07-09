const router = require('express').Router();
const c = require('../controllers/productsController');

router.get('/',              c.getAll);
router.get('/:id',           c.getById);
router.post('/',             c.create);
router.put('/:id',           c.update);
router.get('/category/:cat', c.getByCategory);

module.exports = router;
