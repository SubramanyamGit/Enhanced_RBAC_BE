const sql = require("../config/db");

module.exports = {
  getAll: async () => {
    const [roles] = await sql.query(`
      SELECT r.role_id, r.name, r.created_at, r.department_id, d.name AS department_name
      FROM roles r
      LEFT JOIN departments d ON r.department_id = d.department_id
      ORDER BY r.role_id DESC
    `);

    const [permissions] = await sql.query(`
      SELECT rp.role_id, p.permission_id, p.name AS permission_name
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.permission_id
    `);

    const roleMap = roles.map((role) => {
      const rolePerms = permissions.filter((p) => p.role_id === role.role_id);
      return {
        ...role,
        permission_ids: rolePerms.map((p) => p.permission_id),
        permissions: rolePerms.map((p) => p.permission_name),
      };
    });

    return roleMap;
  },

  getById: async (id) => {
    const [rows] = await sql.query(
      `SELECT * FROM roles WHERE role_id = ?`,
      [id]
    );
    return rows[0];
  },

  create: async ({ name, department_id, permission_ids = [] }) => {
    const conn = await sql.getConnection();
    try {
      await conn.beginTransaction();

      // Unique name check
      const [existing] = await conn.query(
        `SELECT role_id FROM roles WHERE name = ?`,
        [name]
      );
      if (existing.length > 0) {
        const error = new Error("Role name already exists.");
        error.code = "DUPLICATE_ROLE";
        error.status = 409;
        throw error;
      }

      const [result] = await conn.query(
        `INSERT INTO roles (name, department_id) VALUES (?, ?)`,
        [name, department_id || null]
      );

      const role_id = result.insertId;

      if (permission_ids.length > 0) {
        // NOTE: Prefer a UNIQUE INDEX on (role_id, permission_id)
        // so INSERT IGNORE avoids duplicates safely.
        const values = permission_ids.map((pid) => [role_id, pid]);
        await conn.query(
          `INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES ?`,
          [values]
        );
      }

      await conn.commit();
      return { role_id };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  update: async (
    id,
    { name, department_id, grant_permissions = [], revoke_permissions = [] }
  ) => {
    const conn = await sql.getConnection();
    try {
      await conn.beginTransaction();

      // Unique name check (excluding same id)
      const [existing] = await conn.query(
        `SELECT role_id FROM roles WHERE name = ? AND role_id != ?`,
        [name, id]
      );
      if (existing.length > 0) {
        const error = new Error("Another role with this name already exists.");
        error.code = "DUPLICATE_ROLE";
        error.status = 409;
        throw error;
      }

      await conn.query(
        `UPDATE roles SET name = ?, department_id = ? WHERE role_id = ?`,
        [name, department_id || null, id]
      );

      if (revoke_permissions.length > 0) {
        await conn.query(
          `DELETE FROM role_permissions WHERE role_id = ? AND permission_id IN (?)`,
          [id, revoke_permissions]
        );
      }

      if (grant_permissions.length > 0) {
        // Avoid duplicate pairs if a UNIQUE index exists
        const values = grant_permissions.map((pid) => [id, pid]);
        await conn.query(
          `INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES ?`,
          [values]
        );
      }

      await conn.commit();
      return { success: true };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  remove: async (id) => {
    // Pre-check 1: Is role assigned to any user?
    const [[inUsers]] = await sql.query(
      `SELECT 1 AS x FROM user_roles WHERE role_id = ? LIMIT 1`,
      [id]
    );
    if (inUsers) {
      const error = new Error(
        "Cannot delete role: it is assigned to one or more users."
      );
      error.code = "ROLE_IN_USE_USERS";
      error.status = 409;
      throw error;
    }

    // Pre-check 2: Does role have any permissions?
    const [[inPerms]] = await sql.query(
      `SELECT 1 AS x FROM role_permissions WHERE role_id = ? LIMIT 1`,
      [id]
    );
    if (inPerms) {
      const error = new Error(
        "Cannot delete role: it has permissions assigned."
      );
      error.code = "ROLE_IN_USE_PERMISSIONS";
      error.status = 409;
      throw error;
    }

    try {
      const [res] = await sql.query(
        `DELETE FROM roles WHERE role_id = ?`,
        [id]
      );
      if (res.affectedRows === 0) {
        return { success: false, notFound: true };
      }
      return { success: true };
    } catch (e) {
      if (e && (e.errno === 1451 || e.code === "ER_ROW_IS_REFERENCED_2")) {
        const error = new Error(
          "Cannot delete role: it is referenced by other records."
        );
        error.code = "ROLE_FK_BLOCKED";
        error.status = 409;
        throw error;
      }
      throw e;
    }
  },
};
