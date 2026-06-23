const router = require('express').Router();
const c = require('../controllers/dispatchController');

router.get('/',           c.getAll);
router.get('/:id',        c.getById);
router.post('/',          c.create);
router.put('/:id/assign', c.assign);
router.put('/:id/complete', c.complete);

module.exports = router;
