// auditlog.model.js
const db = require('../config/db'); // mysql2/promise pool

/**
 * Get paginated audit logs.
 * Matches schema:
 *   audit_logs(log_id, user_id, action_type, action_details, action_time)
 *   users(user_id, full_name, email, ...)
 */
async function getAll({ page = 1, limit = 10, search = '' }) {
  const offset = (page - 1) * limit;
  const like = `%${search}%`;

  const [rows] = await db.query(
    `
    SELECT
      al.log_id      AS id,
      al.user_id,
      u.full_name    AS user_name,
      u.email        AS user_email,
      al.action_type,
      al.action_details,
      al.action_time
    FROM audit_logs al
    LEFT JOIN users u ON u.user_id = al.user_id
    WHERE
      (? = '' OR
       al.action_type    LIKE ? OR
       al.action_details LIKE ? OR
       u.email           LIKE ? OR
       u.full_name       LIKE ?)
    ORDER BY al.action_time DESC
    LIMIT ? OFFSET ?
    `,
    [search, like, like, like, like, limit, offset]
  );

  const [[{ total }]] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM audit_logs al
    LEFT JOIN users u ON u.user_id = al.user_id
    WHERE
      (? = '' OR
       al.action_type    LIKE ? OR
       al.action_details LIKE ? OR
       u.email           LIKE ? OR
       u.full_name       LIKE ?)
    `,
    [search, like, like, like, like]
  );

  return { rows, total, page, limit };
}

module.exports = { getAll };
