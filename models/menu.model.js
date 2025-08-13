const sql = require('../config/db');

module.exports = {
  getAll: async () => {
    const [rows] = await sql.query(`SELECT * FROM menus ORDER BY id DESC`);
    return rows;
  },

  getById: async (id) => {
    const [rows] = await sql.query(`SELECT * FROM menus WHERE id = ?`, [id]);
    return rows[0];
  },

  create: async ({ label, route, menu_key }) => {
    const conn = await sql.getConnection();
    try {
      await conn.beginTransaction();

      //   Check for duplicate menu_key
      const [existing] = await conn.query(
        `SELECT id FROM menus WHERE menu_key = ?`,
        [menu_key]
      );
      if (existing.length > 0) {
        const error = new Error("Menu key already exists.");
        error.code = "DUPLICATE_MENU_KEY";
        throw error;
      }

      // 1. Insert the menu
      const [result] = await conn.query(
        `INSERT INTO menus (label, route, menu_key) VALUES (?, ?, ?)`,
        [label, route, menu_key]
      );
      const menu_id = result.insertId;

      // 2. Fetch permissions related to menu_key
      const [permissions] = await conn.query(
        `SELECT permission_id FROM permissions WHERE name LIKE ?`,
        [`%${menu_key}%`]
      );

      // 3. Insert into menu_permissions
      if (permissions.length > 0) {
        const values = permissions.map((p) => [menu_id, p.permission_id]);
        await conn.query(
          `INSERT INTO menu_permissions (menu_id, permission_id) VALUES ?`,
          [values]
        );
      }

      await conn.commit();
      return { id: menu_id };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  update: async (id, { label, route, menu_key }) => {
    //   Check for duplicate key in another menu
    const [existing] = await sql.query(
      `SELECT id FROM menus WHERE menu_key = ? AND id != ?`,
      [menu_key, id]
    );
    if (existing.length > 0) {
      const error = new Error("Another menu with this key already exists.");
      error.code = "DUPLICATE_MENU_KEY";
      throw error;
    }

    await sql.query(
      `UPDATE menus SET label = ?, route = ?, menu_key = ? WHERE id = ?`,
      [label, route, menu_key, id]
    );
    return { success: true };
  },

  remove: async (id) => {
    await sql.query(`DELETE FROM menus WHERE id = ?`, [id]);
    return { success: true };
  },
};
