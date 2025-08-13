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

    const roleMap = roles.map(role => {
      const rolePerms = permissions.filter(p => p.role_id === role.role_id);
      return {
        ...role,
        permission_ids: rolePerms.map(p => p.permission_id),
        permissions: rolePerms.map(p => p.permission_name),
      };
    });

    return roleMap;
  },

  getById: async (id) => {
    const [rows] = await sql.query(`SELECT * FROM roles WHERE role_id = ?`, [id]);
    return rows[0];
  },

  create: async ({ name, department_id, permission_ids = [] }) => {
    const conn = await sql.getConnection();
    try {
      await conn.beginTransaction();

      //   Check for duplicate name
      const [existing] = await conn.query(
        `SELECT role_id FROM roles WHERE name = ?`,
        [name]
      );
      if (existing.length > 0) {
        const error = new Error("Role name already exists.");
        error.code = "DUPLICATE_ROLE";
        throw error;
      }

      const [result] = await conn.query(
        `INSERT INTO roles (name, department_id) VALUES (?, ?)`,
        [name, department_id]
      );

      const role_id = result.insertId;

      if (permission_ids.length > 0) {
        const values = permission_ids.map((pid) => [role_id, pid]);
        await conn.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ?`,
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

  update: async (id, { name, department_id, grant_permissions = [], revoke_permissions = [] }) => {
    const conn = await sql.getConnection();
    try {
      await conn.beginTransaction();

      //   Check for duplicate role name in other records
      const [existing] = await conn.query(
        `SELECT role_id FROM roles WHERE name = ? AND role_id != ?`,
        [name, id]
      );
      if (existing.length > 0) {
        const error = new Error("Another role with this name already exists.");
        error.code = "DUPLICATE_ROLE";
        throw error;
      }

      await conn.query(
        `UPDATE roles SET name = ?, department_id = ? WHERE role_id = ?`,
        [name, department_id, id]
      );

      if (revoke_permissions.length > 0) {
        await conn.query(
          `DELETE FROM role_permissions WHERE role_id = ? AND permission_id IN (?)`,
          [id, revoke_permissions]
        );
      }

      if (grant_permissions.length > 0) {
        const values = grant_permissions.map(pid => [id, pid]);
        await conn.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ?`,
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
    await sql.query(`DELETE FROM roles WHERE role_id = ?`, [id]);
    return { success: true };
  },
};
