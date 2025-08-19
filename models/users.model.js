const sql = require("../config/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const groupPermissions = (permissions, menuKeys) => {
  const grouped = {};
  menuKeys.forEach((key) => (grouped[key] = []));
  permissions.forEach((perm) => {
    const matchedKey = menuKeys.find((key) => perm.includes(key));
    if (matchedKey) grouped[matchedKey].push(perm);
    else {
      if (!grouped.misc) grouped.misc = [];
      grouped.misc.push(perm);
    }
  });
  return grouped;
};

module.exports = {
  getUserPermissions: async (token) => {
    if (!token) throw new Error("Unauthorized");

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET_KEY);
    } catch {
      throw new Error("Invalid token");
    }

    const userId = payload.user_id;

    const [permResults] = await sql.query(
      `
      SELECT DISTINCT p.permission_id, p.name 
      FROM permissions p
      JOIN role_permissions rp ON p.permission_id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = ?
      UNION
      SELECT DISTINCT p.permission_id, p.name 
      FROM permissions p
      JOIN user_permissions up ON p.permission_id = up.permission_id
      WHERE up.user_id = ? AND (up.expires_at IS NULL OR up.expires_at > NOW())
    `,
      [userId, userId]
    );

    const permissionNames = permResults.map((p) => p.name);
    const permissionIds = permResults.map((p) => p.permission_id);

    const [menuKeyResults] = await sql.query(`SELECT DISTINCT menu_key FROM menus`);
    const allMenuKeys = menuKeyResults.map((m) => m.menu_key);

    const groupedPermissions = groupPermissions(permissionNames, allMenuKeys);

    const filteredGroupedPermissions = {};
    for (const [key, perms] of Object.entries(groupedPermissions)) {
      if (Array.isArray(perms) && perms.length > 0) {
        filteredGroupedPermissions[key] = perms;
      }
    }

    if (!permissionIds.length) {
      return {
        full_name: payload.full_name,
        role: payload.role,
        permissions: {},
        menu: [],
      };
    }

    const [menuResults] = await sql.query(
      `
      SELECT DISTINCT m.id, m.label, m.route, m.menu_key
      FROM menus m
      JOIN menu_permissions mp ON m.id = mp.menu_id
      WHERE mp.permission_id IN (?)
    `,
      [permissionIds]
    );

    const menu = menuResults
      .filter((menuItem) => filteredGroupedPermissions[menuItem.menu_key]?.length > 0)
      .map((menuItem) => ({
        label: menuItem.label,
        key: menuItem.menu_key,
        route: menuItem.route,
        permissions: filteredGroupedPermissions[menuItem.menu_key],
      }));

    return {
      full_name: payload.full_name,
      role: payload.role,
      permissions: filteredGroupedPermissions,
      menu,
    };
  },

  createUserWithRole: async (userData, roleId) => {
    const conn = await sql.getConnection();
    try {
      await conn.beginTransaction();

      //   Check for duplicate email
      const [existing] = await conn.query(`SELECT user_id FROM users WHERE email = ?`, [
        userData.email,
      ]);
      if (existing.length > 0) {
        const error = new Error("User email already exists.");
        error.code = "DUPLICATE_USER_EMAIL";
        throw error;
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const [userResult] = await conn.query(
        `INSERT INTO users (full_name, email, password, user_status)
         VALUES (?, ?, ?, ?)`,
        [
          userData.full_name,
          userData.email,
          hashedPassword,
          userData.user_status || "Active",
        ]
      );

      const userId = userResult.insertId;

      await conn.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`,
        [userId, roleId]
      );

      await conn.commit();
      return { success: true, userId };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  getAll: async () => {
    const [rows] = await sql.query(`
      SELECT 
        u.user_id,
        u.full_name,
        u.email,
        u.user_status,
        GROUP_CONCAT(r.name) AS roles,
        ur.role_id,
        u.created_at,u.updated_at
      FROM users u
      LEFT JOIN user_roles ur ON u.user_id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.role_id
      GROUP BY u.user_id, ur.role_id
      ORDER BY u.updated_at DESC
    `);
    return rows;
  },

  getById: async (id) => {
    const [rows] = await sql.query(`SELECT * FROM users WHERE user_id = ?`, [id]);
    return rows[0];
  },

  updateUser: async (user_id, updatedData, role_id) => {
    const conn = await sql.getConnection();
    try {
      await conn.beginTransaction();

      const updates = [];
      const values = [];

      if (updatedData.full_name) {
        updates.push("full_name = ?");
        values.push(updatedData.full_name);
      }

      if (updatedData.user_status) {
        updates.push("user_status = ?");
        values.push(updatedData.user_status);
      }

      if (updatedData.password) {
        const hashed = await bcrypt.hash(updatedData.password, 10);
        updates.push("password = ?");
        values.push(hashed);
      }

      if (updates.length > 0) {
        const updateQuery = `UPDATE users SET ${updates.join(", ")} WHERE user_id = ?`;
        await conn.query(updateQuery, [...values, user_id]);
      }

      if (role_id) {
        await conn.query(`DELETE FROM user_roles WHERE user_id = ?`, [user_id]);
        await conn.query(
          `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`,
          [user_id, role_id]
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

  deleteUser: async (user_id) => {
    const conn = await sql.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(`DELETE FROM user_roles WHERE user_id = ?`, [user_id]);
      await conn.query(`DELETE FROM users WHERE user_id = ?`, [user_id]);
      await conn.commit();
      return { success: true };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },
};
