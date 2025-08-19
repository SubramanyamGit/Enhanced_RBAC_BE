const sql = require("../config/db");

module.exports = {
  getAll: async () => {
    const [rows] = await sql.query(`
      SELECT department_id, name, description, created_at
      FROM departments
      ORDER BY department_id DESC
    `);
    return rows;
  },

  getById: async (id) => {
    const [rows] = await sql.query(
      `SELECT department_id, name, description, created_at FROM departments WHERE department_id = ?`,
      [id]
    );
    return rows[0];
  },

  create: async ({ name, description }) => {
    // Duplicate name check
    const [existing] = await sql.query(
      `SELECT department_id FROM departments WHERE name = ?`,
      [name]
    );
    if (existing.length > 0) {
      const error = new Error("Department name already exists.");
      error.code = "DUPLICATE_DEPARTMENT";
      error.status = 409;
      throw error;
    }

    const [result] = await sql.query(
      `INSERT INTO departments (name, description) VALUES (?, ?)`,
      [name, description || null]
    );
    return { department_id: result.insertId };
  },

  update: async (id, { name, description }) => {
    // Duplicate in other rows
    const [existing] = await sql.query(
      `SELECT department_id FROM departments WHERE name = ? AND department_id != ?`,
      [name, id]
    );
    if (existing.length > 0) {
      const error = new Error("Another department with this name already exists.");
      error.code = "DUPLICATE_DEPARTMENT";
      error.status = 409;
      throw error;
    }

    await sql.query(
      `UPDATE departments SET name = ?, description = ? WHERE department_id = ?`,
      [name, description || null, id]
    );
    return { success: true };
  },

  remove: async (id) => {
    // Pre-check: block delete if any roles belong to this department
    const [[inRoles]] = await sql.query(
      `SELECT 1 AS x FROM roles WHERE department_id = ? LIMIT 1`,
      [id]
    );
    if (inRoles) {
      const error = new Error("Cannot delete department: it has roles assigned.");
      error.code = "DEPARTMENT_IN_USE_ROLES";
      error.status = 409;
      throw error;
    }

    // Attempt delete; FK RESTRICT will also protect if present
    try {
      const [res] = await sql.query(
        `DELETE FROM departments WHERE department_id = ?`,
        [id]
      );
      if (res.affectedRows === 0) {
        return { success: false, notFound: true };
      }
      return { success: true };
    } catch (e) {
      // MySQL FK error safety net
      if (e && (e.errno === 1451 || e.code === "ER_ROW_IS_REFERENCED_2")) {
        const error = new Error("Cannot delete department: it is referenced by other records.");
        error.code = "DEPARTMENT_FK_BLOCKED";
        error.status = 409;
        throw error;
      }
      throw e;
    }
  },
};
