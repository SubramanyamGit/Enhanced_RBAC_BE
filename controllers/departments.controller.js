const departmentModel = require("../models/departments.model");
const logAudit = require("../utils/auditLoggers");

exports.getDepartments = async (req, res) => {
  try {
    const departments = await departmentModel.getAll();

    await logAudit({
      userId: req.user.user_id,
      actionType: "VIEW_DEPARTMENTS",
      details: "Fetched all departments",
    });

    res.json(departments);
  } catch (err) {
    console.error("Get Departments Error:", err);
    res
      .status(500)
      .json({ code: "GET_DEPARTMENTS_FAILED", message: "Failed to fetch departments" });
  }
};

exports.getDepartmentById = async (req, res) => {
  try {
    const department = await departmentModel.getById(req.params.id);
    if (!department) {
      return res.status(404).json({ code: "NOT_FOUND", message: "Department not found" });
    }

    await logAudit({
      userId: req.user.user_id,
      actionType: "VIEW_DEPARTMENT",
      details: { department_id: req.params.id },
    });

    res.json(department);
  } catch (err) {
    console.error("Get Department By ID Error:", err);
    res
      .status(500)
      .json({ code: "GET_DEPARTMENT_FAILED", message: "Failed to fetch department" });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    let { name, description } = req.body || {};
    name = (name || "").trim();
    description = description ?? null;

    if (!name) {
      return res.status(400).json({ code: "VALIDATION_ERROR", message: "Name is required" });
    }

    const result = await departmentModel.create({ name, description });

    await logAudit({
      userId: req.user.user_id,
      actionType: "CREATE_DEPARTMENT",
      details: { department_id: result.department_id, name },
    });

    res.status(201).json({
      success: true,
      message: "Department created successfully",
      department_id: result.department_id,
    });
  } catch (err) {
    console.error("Create Department Error:", err);
    if (err.code === "DUPLICATE_DEPARTMENT") {
      return res.status(err.status || 409).json({ code: err.code, message: err.message });
    }
    res
      .status(500)
      .json({ code: "CREATE_DEPARTMENT_FAILED", message: "Failed to create department" });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    let { name, description } = (req.body || {});
    name = (name || "").trim();
    description = description ?? null;

    if (!name) {
      return res.status(400).json({ code: "VALIDATION_ERROR", message: "Name is required" });
    }

    // Ensure department exists
    const existing = await departmentModel.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ code: "NOT_FOUND", message: "Department not found" });
    }

    await departmentModel.update(req.params.id, { name, description });

    await logAudit({
      userId: req.user.user_id,
      actionType: "UPDATE_DEPARTMENT",
      details: { department_id: req.params.id, updatedFields: { name, description } },
    });

    res.json({ success: true, message: "Department updated successfully" });
  } catch (err) {
    console.error("Update Department Error:", err);
    if (err.code === "DUPLICATE_DEPARTMENT") {
      return res.status(err.status || 409).json({ code: err.code, message: err.message });
    }
    res
      .status(500)
      .json({ code: "UPDATE_DEPARTMENT_FAILED", message: "Failed to update department" });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const departmentId = req.params.id;

    const result = await departmentModel.remove(departmentId);

    if (result?.notFound) {
      return res.status(404).json({ code: "NOT_FOUND", message: "Department not found" });
    }

    await logAudit({
      userId: req.user.user_id,
      actionType: "DELETE_DEPARTMENT",
      details: { department_id: departmentId },
    });

    res.json({ success: true, message: "Department deleted successfully" });
  } catch (err) {
    console.error("Delete Department Error:", err);

    if (
      err.code === "DEPARTMENT_IN_USE_ROLES" ||
      err.code === "DEPARTMENT_FK_BLOCKED"
    ) {
      return res.status(err.status || 409).json({ code: err.code, message: err.message });
    }

    res
      .status(500)
      .json({ code: "DELETE_DEPARTMENT_FAILED", message: "Failed to delete department" });
  }
};
