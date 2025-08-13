const sql = require('../config/db');

module.exports = {
  getAll: async () => {
    const [rows] = await sql.query(`SELECT * FROM permissions ORDER BY permission_id DESC`);
    return rows;
  },

  getById: async (id) => {
    const [rows] = await sql.query(`SELECT * FROM permissions WHERE permission_id = ?`, [id]);
    return rows[0];
  },

  create: async ({ name, description }) => {
    //   Check for duplicate permission name
    const [existing] = await sql.query(
      `SELECT permission_id FROM permissions WHERE name = ?`,
      [name]
    );
    if (existing.length > 0) {
      const error = new Error("Permission name already exists.");
      error.code = "DUPLICATE_PERMISSION";
      throw error;
    }

    const [result] = await sql.query(
      `INSERT INTO permissions (name, description) VALUES (?, ?)`,
      [name, description]
    );
    return { permission_id: result.insertId };
  },

  update: async (id, { name, description }) => {
    //   Check for duplicate name in other rows
    const [existing] = await sql.query(
      `SELECT permission_id FROM permissions WHERE name = ? AND permission_id != ?`,
      [name, id]
    );
    if (existing.length > 0) {
      const error = new Error("Another permission with this name already exists.");
      error.code = "DUPLICATE_PERMISSION";
      throw error;
    }

    await sql.query(
      `UPDATE permissions SET name = ?, description = ? WHERE permission_id = ?`,
      [name, description, id]
    );
    return { success: true };
  },

  remove: async (id) => {
    await sql.query(`DELETE FROM permissions WHERE permission_id = ?`, [id]);
    return { success: true };
  },
};
