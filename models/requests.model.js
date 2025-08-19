const sql = require('../config/db');

module.exports = {
  // Get all requests (admin) or by user_id
  getAll: async ({ userId, isAdmin, status }) => {
    let query, values;

    if (isAdmin) {
      if (status === 'Pending') {
        query = `
          SELECT
            pr.*,
            p.name AS permission_name,
            u.user_id AS requested_by,
            u.full_name AS requested_by_name,
            r.full_name AS reviewed_by_name
          FROM permission_requests pr
          JOIN permissions p ON pr.permission_id = p.permission_id
          JOIN users u ON pr.user_id = u.user_id
          LEFT JOIN users r ON pr.reviewed_by = r.user_id
          WHERE pr.status = ?
          ORDER BY pr.requested_at DESC
        `;
        values = [status];
      } else {
        query = `
          SELECT
            pr.*,
            p.name AS permission_name,
            u.user_id AS requested_by,
            u.full_name AS requested_by_name,
            r.full_name AS reviewed_by_name
          FROM permission_requests pr
          JOIN permissions p ON pr.permission_id = p.permission_id
          JOIN users u ON pr.user_id = u.user_id
          LEFT JOIN users r ON pr.reviewed_by = r.user_id
          WHERE pr.status = ? AND pr.reviewed_by = ?
          ORDER BY pr.requested_at DESC
        `;
        values = [status, userId];
      }
    } else {
      query = `
        SELECT
          pr.*,
          p.name AS permission_name,
          u.user_id AS requested_by,
          u.full_name AS requested_by_name,
          r.full_name AS reviewed_by_name
        FROM permission_requests pr
        JOIN permissions p ON pr.permission_id = p.permission_id
        JOIN users u ON pr.user_id = u.user_id
        LEFT JOIN users r ON pr.reviewed_by = r.user_id
        WHERE pr.user_id = ? AND pr.status = ?
        ORDER BY pr.requested_at DESC
      `;
      values = [userId, status];
    }

    const [rows] = await sql.query(query, values);
    return rows;
  },

  create: async ({ user_id, permission_id, reason, expires_at }) => {
    const [result] = await sql.query(
      `INSERT INTO permission_requests (user_id, permission_id, reason, expires_at)
       VALUES (?, ?, ?, ?)`,
      [user_id, permission_id, reason, expires_at || null]
    );
    return { request_id: result.insertId };
  },

  approve: async ({ request_id, reviewed_by }) => {
    const conn = await sql.getConnection();
    try {
      await conn.beginTransaction();

      const [[request]] = await conn.query(
        `SELECT * FROM permission_requests WHERE request_id = ?`,
        [request_id]
      );

      if (!request || request.status !== 'Pending') {
        throw new Error('Invalid or already processed request');
      }

      // Grant permission
      await conn.query(
        `INSERT INTO user_permissions (user_id, permission_id, expires_at)
         VALUES (?, ?, ?)`,
        [request.user_id, request.permission_id, request.expires_at || null]
      );

      // Update request status
      await conn.query(
        `UPDATE permission_requests
         SET status = 'Approved', reviewed_by = ?, reviewed_at = NOW()
         WHERE request_id = ?`,
        [reviewed_by, request_id]
      );

      await conn.commit();
      return { success: true };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  reject: async ({ request_id, reviewed_by, rejection_reason }) => {
    const [result] = await sql.query(
      `UPDATE permission_requests
       SET status = 'Rejected', reviewed_by = ?, reviewed_at = NOW(), rejection_reason = ?
       WHERE request_id = ?`,
      [reviewed_by, rejection_reason, request_id]
    );
    return { success: result.affectedRows > 0 };
  },
};
