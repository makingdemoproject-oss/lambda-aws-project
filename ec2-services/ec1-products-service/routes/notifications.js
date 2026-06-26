const router = require('express').Router();
const c = require('../controllers/notificationsController');

router.get('/',            c.getAll);
router.post('/',           c.send);
router.get('/type/:type',  c.getByType);
router.get('/user/:uid',   c.getByUser);
router.put('/:id/read',    c.markRead);

module.exports = router;
