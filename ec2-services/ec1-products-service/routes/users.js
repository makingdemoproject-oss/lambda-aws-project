const router = require('express').Router();
const c = require('../controllers/usersController');

router.get('/',            c.getAll);
router.get('/:id',         c.getById);
router.post('/',           c.create);
router.put('/:id',         c.update);
router.get('/role/:role',  c.getByRole);

module.exports = router;
