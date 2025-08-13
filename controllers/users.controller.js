const userModel = require("../models/users.model");
const logAudit = require("../utils/auditLoggers");
const sendMail = require("../utils/mailer");

exports.getMyPermissions = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const userInfo = await userModel.getUserPermissions(token);
    res.json(userInfo);
  } catch (err) {
    res.status(403).json({ error: err.message || "Invalid token" });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await userModel.getAll();

    await logAudit({
      userId: req.user.user_id,
      actionType: "VIEW_USERS",
      details: "Fetched all users",
    });

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await userModel.getById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    await logAudit({
      userId: req.user.user_id,
      actionType: "VIEW_USER",
      details: `Viewed user ID ${req.params.id}`,
    });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { full_name, email, password, user_status, role_id } = req.body;
    if (!full_name || !email || !password || !role_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await userModel.createUserWithRole(
      { full_name, email, password, user_status },
      role_id
    );

    await logAudit({
      userId: req.user.user_id,
      actionType: "CREATE_USER",
      details: {
        user_id: result.userId,
        full_name,
        email,
        role_id,
      },
    });

    await sendMail({
      to: email,
      subject: "Your RBAC Account has been created",
      html: `
        <p>Hello ${full_name},</p>
        <p>Your account has been created. You can sign in using the following:</p>
        <ul>
          <li><b>Email:</b> ${email}</li>
          <li><b>Password:</b> ${password}</li>
        </ul>
        <p>Please change your password after first login.</p>
      `,
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      userId: result.userId,
    });
  } catch (err) {

    if (err.code === "DUPLICATE_USER_EMAIL") {
      return res.status(409).json({ error: err.message });
    }

    res.status(500).json({ error: "Failed to create user" });
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { full_name, password, role_id, user_status } = req.body;

  try {
    await userModel.updateUser(id, { full_name, password, user_status }, role_id);

    await logAudit({
      userId: req.user.user_id,
      actionType: "UPDATE_USER",
      details: {
        user_id: id,
        full_name,
        user_status,
        role_id,
        changed_password: !!password,
      },
    });

    res.json({ success: true, message: "User updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update user" });
  }
};

exports.deleteUser = async (req, res) => {
  const { user_id } = req.params;

  try {
    await userModel.deleteUser(user_id);

    await logAudit({
      userId: req.user.user_id,
      actionType: "DELETE_USER",
      details: `Deleted user ID ${user_id}`,
    });

    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user" });
  }
};
