const sql = require('../config/db');

module.exports = {
  getAll: async () => {
    const [rows] = await sql.query(
      `SELECT * FROM permissions ORDER BY permission_id DESC`
    );
    return rows;
  },

  getById: async (id) => {
    const [rows] = await sql.query(
      `SELECT * FROM permissions WHERE permission_id = ?`,
      [id]
    );
    return rows[0];
  },

  create: async ({ name, description }) => {
    // Duplicate name check
    const [existing] = await sql.query(
      `SELECT permission_id FROM permissions WHERE name = ?`,
      [name]
    );
    if (existing.length > 0) {
      const error = new Error('Permission name already exists.');
      error.code = 'DUPLICATE_PERMISSION';
      error.status = 409;
      throw error;
    }

    const [result] = await sql.query(
      `INSERT INTO permissions (name, description) VALUES (?, ?)`,
      [name, description || null]
    );
    return { permission_id: result.insertId };
  },

  update: async (id, { name, description }) => {
    const [existing] = await sql.query(
      `SELECT permission_id FROM permissions WHERE name = ? AND permission_id != ?`,
      [name, id]
    );
    if (existing.length > 0) {
      const error = new Error('Another permission with this name already exists.');
      error.code = 'DUPLICATE_PERMISSION';
      error.status = 409;
      throw error;
    }

    await sql.query(
      `UPDATE permissions SET name = ?, description = ? WHERE permission_id = ?`,
      [name, description || null, id]
    );
    return { success: true };
  },

  remove: async (id) => {
    // Pre-check 1: Is this permission attached to any role?
    const [[inRoles]] = await sql.query(
      `SELECT 1 AS x FROM role_permissions WHERE permission_id = ? LIMIT 1`,
      [id]
    );
    if (inRoles) {
      const error = new Error(
        'Cannot delete permission: it is attached to one or more roles.'
      );
      error.code = 'PERMISSION_IN_ROLES';
      error.status = 409;
      throw error;
    }

    // Pre-check 2: Is this permission granted directly to any user?
    const [[inUsers]] = await sql.query(
      `SELECT 1 AS x FROM user_permissions WHERE permission_id = ? LIMIT 1`,
      [id]
    );
    if (inUsers) {
      const error = new Error(
        'Cannot delete permission: it is granted to one or more users.'
      );
      error.code = 'PERMISSION_IN_USERS';
      error.status = 409;
      throw error;
    }

    // Attempt delete (FKs with ON DELETE RESTRICT should also protect at DB level)
    try {
      const [res] = await sql.query(
        `DELETE FROM permissions WHERE permission_id = ?`,
        [id]
      );
      if (res.affectedRows === 0) {
        return { success: false, notFound: true };
      }
      return { success: true };
    } catch (e) {
      // MySQL FK error safety net: ER_ROW_IS_REFERENCED_2 (1451)
      if (e && (e.errno === 1451 || e.code === 'ER_ROW_IS_REFERENCED_2')) {
        const error = new Error(
          'Cannot delete permission: it is referenced by other records.'
        );
        error.code = 'PERMISSION_FK_BLOCKED';
        error.status = 409;
        throw error;
      }
      throw e;
    }
  },
};
