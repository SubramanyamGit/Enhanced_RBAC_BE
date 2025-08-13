// routes/permissions.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/permissions.controller');
const authenticate = require('../middlewares/auth.middleware');
const adminOnly = require('../middlewares/adminOnly.middleware');

router.use(authenticate);

router.get('/', controller.getPermissions);
router.get('/:id', controller.getPermissionById);
router.post('/', adminOnly,controller.createPermission);
router.patch('/:id',adminOnly, controller.updatePermission);
router.delete('/:id',adminOnly, controller.deletePermission);

module.exports = router;
