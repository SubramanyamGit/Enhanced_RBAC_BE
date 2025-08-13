const db = require("../config/db");

const updateUserPassword = async (user_id, hashedPassword) => {
  await db.query(
    "UPDATE users SET password = ?, must_change_password = 0 WHERE user_id = ?",
    [hashedPassword, user_id]
  );
};

module.exports = {
  updateUserPassword,
};
