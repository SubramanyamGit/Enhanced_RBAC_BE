const requestModel = require("../models/requests.model");
const logAudit = require("../utils/auditLoggers");
const db = require("../config/db");
const sendMail = require("../utils/mailer");
const { getById } = require("../models/users.model");

exports.getRequests = async (req, res) => {
  try {
    const status = req.query.status || "Pending"; // 'Pending', 'Approved', 'Rejected'
    const isAdmin = req.user.role === "Admin";

    const requests = await requestModel.getAll({
      userId: req.user.user_id,
      isAdmin,
      status,
    });

    res.json(requests);
  } catch (err) {
      console.error("Error fetching requests:", err);
    res.status(500).json({ error: "Failed to fetch requests" });
  }
};

exports.createRequest = async (req, res) => {
  try {
    const { permission_id, reason, expires_at } = req.body;
    const result = await requestModel.create({
      user_id: req.user.user_id,
      permission_id,
      reason,
      expires_at,
    });

    await logAudit({
      userId: req.user.user_id,
      actionType: "CREATE_PERMISSION_REQUEST",
      details: { permission_id, reason, expires_at },
    });

      console.log("");

    // Get admin role ID dynamically
    const [[roleRow]] = await db.query(
      `SELECT role_id FROM roles WHERE name = 'Admin'`
    );
      console.log("roleRow", roleRow);

    const adminRoleId = roleRow?.role_id;

    if (!adminRoleId) {
      throw new Error("Admin role not found");
    }

    // Fetch admin emails
    const [admins] = await db.query(
      `SELECT email FROM users WHERE user_status = 'Active' AND user_id IN (
    SELECT user_id FROM user_roles WHERE role_id = ?
  )`,
      [adminRoleId]
    );

      console.log("admins", admins);

    // Notify admins
    await Promise.all(
      admins.map((admin) =>
        sendMail({
          to: admin.email,
          subject: "New Permission Request",
          html: `
      <p>User <b>${req.user.full_name}</b> requested access to: <b>${req.body.permission_name}</b></p>
      <p>Please log in to approve or reject the request.</p>
    `,
        })
      )
    );

    res
      .status(201)
      .json({ message: "Request submitted", request_id: result.request_id });
  } catch (err) {
      console.log(err);

    res.status(500).json({ error: "Failed to create request" });
  }
};

exports.approveRequest = async (req, res) => {
  const request_id = req.params.id;
  const { requested_by, permission_name } = req.body; // requested_by = user_id
  const adminId = req.user.user_id;

  try {
    //   1. Fetch user details using user_id
    const userResult = await getById(requested_by); // Assume this returns [{ name, email }]
    if (!userResult) {
      return res.status(404).json({ error: "Requested user not found" });
    }

    const requested_by_name = userResult.name;
    const requested_by_email = userResult.email;

    //   2. Approve the request
    await requestModel.approve({
      request_id,
      reviewed_by: adminId,
    });

    //   3. Log audit
    await logAudit({
      userId: adminId,
      actionType: "APPROVE_PERMISSION_REQUEST",
      details: { request_id },
    });

    //   4. Send email
    await sendMail({
      to: requested_by_email,
      subject: `Your Permission Request was Approved`,
      html: `
        <p>Hello ${requested_by_name},</p>
        <p>Your request for <b>${permission_name}</b> has been <strong>Approved</strong> by Admin.</p>
      `,
    });

    res.json({ message: "Request approved" });
  } catch (err) {
      console.error(err);
    res.status(500).json({ error: err.message || "Failed to approve request" });
  }
};
exports.rejectRequest = async (req, res) => {
  try {
    const { rejection_reason } = req.body;
    await requestModel.reject({
      request_id: req.params.id,
      reviewed_by: req.user.user_id,
      rejection_reason,
    });

    await logAudit({
      userId: req.user.user_id,
      actionType: "REJECT_PERMISSION_REQUEST",
      details: { request_id: req.params.id, rejection_reason },
    });

    res.json({ message: "Request rejected" });
  } catch (err) {
    res.status(500).json({ error: "Failed to reject request" });
  }
};
