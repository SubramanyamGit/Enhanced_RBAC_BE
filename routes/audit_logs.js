// auditlog.routes.js
const express = require('express');
const router = express.Router();
const AuditController = require('../controllers/audit_logs.controller');
const authMiddleware  = require('../middlewares/auth.middleware');
// const { requirePermission } = require('../middleware/permissions');

console.log("HEEELO");

// Read-only list
router.get(
  '/',
  authMiddleware,
//   requirePermission('audit_logs.view'), // align with your RBAC
  AuditController.getAll
);

module.exports = router;
