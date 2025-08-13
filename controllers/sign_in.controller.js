const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  getUserByEmailWithRole,
  setTempPasswordByEmail,
} = require("../models/sign_in.model");
const sendMail = require("../utils/mailer");

function genTempPassword(len = 12) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%*?";
  return Array.from(
    { length: len },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}


exports.signIn = async (req, res) => {
  const { email, password: inputPassword } = req.body;

  try {
    const user = await getUserByEmailWithRole(email);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (user.user_status === "Inactive") {
      return res
        .status(403)
        .json({ error: "Account inactive. Contact admin." });
    }

    const isMatch = await bcrypt.compare(inputPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 👇 include must_change_password in token payload
    const token = jwt.sign(
      {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        must_change_password: user.must_change_password,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "6h" }
    );

    res.json({
      token,
      mustChangePassword: user.must_change_password,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        user_status: user.user_status,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body || {};
  try {
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Generate and hash temporary password
    const temp = genTempPassword();
    const hash = await bcrypt.hash(temp, 10);

    // Update DB
    const updated = await setTempPasswordByEmail(email, hash);

    if (updated) {
      try {
        await sendMail({
          to: email,
          subject: 'Your Temporary Password',
          html: `
            <p>Hello,</p>
            <p>Your temporary password is: <b>${temp}</b></p>
            <p>Use it to sign in. You will be prompted to set a new password immediately.</p>
            <p>If you didn’t request this, please ignore this email.</p>
          `,
        });
      } catch (mailErr) {
      }
    }

    // Generic response to avoid revealing account existence
    res.json({
      success: true,
      message: 'If the email exists, a temporary password was sent.',
    });
  } catch (err) {
    next(err);
  }
};
