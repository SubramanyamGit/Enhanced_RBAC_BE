// models/sign_in.model.js
const sql = require("../config/db");

const getUserByEmailWithRole = async (email) => {
  const [rows] = await sql.query(`
    SELECT 
      u.user_id,
      u.full_name,
      u.email,
      u.password,
      u.user_status,
      u.must_change_password,
      r.name AS role
    FROM users u
    LEFT JOIN user_roles ur ON u.user_id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.role_id
    WHERE u.email = ?
  `, [email]);

  return rows[0]; // undefined if not found
};

const setTempPasswordByEmail = async (email, hashedPassword) => {
  const [result] = await sql.query(
    `UPDATE users
        SET password = ?, must_change_password = 1, updated_at = NOW()
      WHERE email = ? AND user_status = 'Active'`,
    [hashedPassword, email]
  );
  return result.affectedRows; // 0 if not found, 1 if updated
};

module.exports = {
  getUserByEmailWithRole,
  setTempPasswordByEmail
};
