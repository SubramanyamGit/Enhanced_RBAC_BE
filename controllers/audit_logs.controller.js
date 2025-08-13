// auditlog.controller.js
const AuditLog = require('../models/audit_logs.model');

async function getAll(req, res, next) {
    console.log("CONTROLLER")
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const search = (req.query.search || '').trim();

    const data = await AuditLog.getAll({ page, limit, search });
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll };
