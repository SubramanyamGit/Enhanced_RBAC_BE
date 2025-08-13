const sql = require("../config/db");

/**
 * Logs an audit action into the audit_logs table.
 * @param {Object} options
 * @param {number|null} options.userId - The user performing the action (can be null for system actions)
 * @param {string} options.actionType - E.g. 'CREATE_DEPARTMENT', 'DELETE_USER'
 * @param {string|Object} options.details - Description or object of what happened
 */
const logAudit = async ({ userId, actionType, details }) => {
  try {
    const actionDetails =
      typeof details === "string" ? details : JSON.stringify(details);

    await sql.query(
      `INSERT INTO audit_logs (user_id, action_type, action_details) VALUES (?, ?, ?)`,
      [userId, actionType, actionDetails]
    );
  } catch (err) {
      console.error("Audit log error:", err); // Don't block operations on failure
  }
};

module.exports = logAudit;
