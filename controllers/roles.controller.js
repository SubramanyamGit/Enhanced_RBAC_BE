const roleModel = require("../models/roles.model");
const sql = require("../config/db");
const logAudit = require("../utils/auditLoggers");

exports.getRoles = async (req, res) => {
  try {
    const roles = await roleModel.getAll();

    await logAudit({
      userId: req.user.user_id,
      actionType: "VIEW_ROLES",
      details: "Fetched all roles",
    });

    res.json(roles);
  } catch (err) {
    console.error("Get Roles Error:", err);
    res
      .status(500)
      .json({ code: "GET_ROLES_FAILED", message: "Failed to fetch roles" });
  }
};

exports.getRoleById = async (req, res) => {
  try {
    const role = await roleModel.getById(req.params.id);
    if (!role) {
      return res
        .status(404)
        .json({ code: "NOT_FOUND", message: "Role not found" });
    }

    // Fetch assigned permission IDs
    const [permRows] = await sql.query(
      `SELECT permission_id FROM role_permissions WHERE role_id = ?`,
      [req.params.id]
    );
    role.permission_ids = permRows.map((p) => p.permission_id);

    await logAudit({
      userId: req.user.user_id,
      actionType: "VIEW_ROLE",
      details: { role_id: req.params.id },
    });

    res.json(role);
  } catch (err) {
    console.error("Get Role By ID Error:", err);
    res
      .status(500)
      .json({ code: "GET_ROLE_FAILED", message: "Failed to fetch role" });
  }
};

exports.createRole = async (req, res) => {
  try {
    let { name, department_id, permission_ids = [] } = req.body || {};
    name = (name || "").trim();
    if (!name) {
      return res
        .status(400)
        .json({ code: "VALIDATION_ERROR", message: "Name is required" });
    }

    const result = await roleModel.create({
      name,
      department_id,
      permission_ids,
    });

    await logAudit({
      userId: req.user.user_id,
      actionType: "CREATE_ROLE",
      details: { role_id: result.role_id, name, department_id, permission_ids },
    });

    res.status(201).json({
      success: true,
      message: "Role created successfully",
      role_id: result.role_id,
    });
  } catch (err) {
    console.error("Create Role Error:", err);
    if (err.code === "DUPLICATE_ROLE") {
      return res
        .status(err.status || 409)
        .json({ code: err.code, message: err.message });
    }
    res
      .status(500)
      .json({ code: "CREATE_ROLE_FAILED", message: "Failed to create role" });
  }
};

exports.updateRole = async (req, res) => {
  try {
    let {
      name,
      department_id,
      grant_permissions = [],
      revoke_permissions = [],
    } = req.body || {};
    name = (name || "").trim();
    if (!name) {
      return res
        .status(400)
        .json({ code: "VALIDATION_ERROR", message: "Name is required" });
    }

    // Ensure role exists (clearer 404)
    const existing = await roleModel.getById(req.params.id);
    if (!existing) {
      return res
        .status(404)
        .json({ code: "NOT_FOUND", message: "Role not found" });
    }

    await roleModel.update(req.params.id, {
      name,
      department_id,
      grant_permissions,
      revoke_permissions,
    });

    await logAudit({
      userId: req.user.user_id,
      actionType: "UPDATE_ROLE",
      details: {
        role_id: req.params.id,
        name,
        department_id,
        grant_permissions,
        revoke_permissions,
      },
    });

    res.json({ success: true, message: "Role updated successfully" });
  } catch (err) {
    console.error("Update Role Error:", err);
    if (err.code === "DUPLICATE_ROLE") {
      return res
        .status(err.status || 409)
        .json({ code: err.code, message: err.message });
    }
    res
      .status(500)
      .json({ code: "UPDATE_ROLE_FAILED", message: "Failed to update role" });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const result = await roleModel.remove(req.params.id);

    if (result?.notFound) {
      return res
        .status(404)
        .json({ code: "NOT_FOUND", message: "Role not found" });
    }

    await logAudit({
      userId: req.user.user_id,
      actionType: "DELETE_ROLE",
      details: { role_id: req.params.id },
    });

    res.json({ success: true, message: "Role deleted successfully" });
  } catch (err) {
    console.error("Delete Role Error:", err);

    // Map “in use” / FK-blocked cases to 409 Conflict
    if (
      err.code === "ROLE_IN_USE_USERS" ||
      err.code === "ROLE_IN_USE_PERMISSIONS" ||
      err.code === "ROLE_FK_BLOCKED"
    ) {
      return res
        .status(err.status || 409)
        .json({ code: err.code, message: err.message });
    }

    res
      .status(500)
      .json({ code: "DELETE_ROLE_FAILED", message: "Failed to delete role" });
  }
};
