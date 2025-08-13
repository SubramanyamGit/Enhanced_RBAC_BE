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
    res.status(500).json({ error: "Failed to fetch departments" });
  }
};

exports.getDepartmentById = async (req, res) => {
  try {
    const department = await departmentModel.getById(req.params.id);
    if (!department) return res.status(404).json({ error: "Department not found" });

    await logAudit({
      userId: req.user.user_id,
      actionType: "VIEW_DEPARTMENT",
      details: `Viewed department ID ${req.params.id}`,
    });

    res.json(department);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch department" });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

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
    if (err.code === "DUPLICATE_DEPARTMENT") {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: "Failed to create department" });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;
    const departmentId = req.params.id;

    await departmentModel.update(departmentId, { name, description });

    await logAudit({
      userId: req.user.user_id,
      actionType: "UPDATE_DEPARTMENT",
      details: { department_id: departmentId, updatedFields: { name, description } },
    });

    res.json({ success: true, message: "Department updated successfully" });
  } catch (err) {
    if (err.code === "DUPLICATE_DEPARTMENT") {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: "Failed to update department" });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const departmentId = req.params.id;

    await departmentModel.remove(departmentId);

    await logAudit({
      userId: req.user.user_id,
      actionType: "DELETE_DEPARTMENT",
      details: `Deleted department ID ${departmentId}`,
    });

    res.json({ success: true, message: "Department deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete department" });
  }
};
