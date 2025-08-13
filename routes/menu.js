// routes/menu.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/menu.controller');
const authenticate = require('../middlewares/auth.middleware');
const adminOnly = require('../middlewares/adminOnly.middleware');

router.use(authenticate);
router.use(adminOnly);

router.get('/', controller.getMenus);
router.post('/', controller.createMenu);
router.patch('/:id', controller.updateMenu);
router.delete('/:id', controller.deleteMenu);

module.exports = router;
