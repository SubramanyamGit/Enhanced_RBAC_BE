const bcrypt = require("bcrypt");
const { updateUserPassword } = require("../models/set_password.model");

exports.setPassword = async (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({
      error: "Password must be at least 6 characters long.",
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await updateUserPassword(req.user.user_id, hashedPassword);

    res.json({
      success: true,
      message: "Password updated successfully. Please log in again.",
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};
