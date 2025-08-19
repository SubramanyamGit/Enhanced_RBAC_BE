const permissionModel = require('../models/permissions.model');
const logAudit = require('../utils/auditLoggers');

exports.getPermissions = async (req, res) => {
  try {
    const permissions = await permissionModel.getAll();

    await logAudit({
      userId: req.user.user_id,
      actionType: 'VIEW_PERMISSIONS',
      details: 'Fetched all permissions',
    });

    res.json(permissions);
  } catch (err) {
    console.error('Get Permissions Error:', err);
    res.status(500).json({ code: 'GET_PERMISSIONS_FAILED', message: 'Failed to fetch permissions' });
  }
};

exports.getPermissionById = async (req, res) => {
  try {
    const permission = await permissionModel.getById(req.params.id);

    if (!permission) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Permission not found' });
    }

    await logAudit({
      userId: req.user.user_id,
      actionType: 'VIEW_PERMISSION',
      details: { permission_id: req.params.id },
    });

    res.json(permission);
  } catch (err) {
    console.error('Get Permission By ID Error:', err);
    res.status(500).json({ code: 'GET_PERMISSION_FAILED', message: 'Failed to fetch permission' });
  }
};

exports.createPermission = async (req, res) => {
  try {
    let { name, description } = req.body || {};
    name = (name || '').trim();
    description = description ?? null;

    if (!name) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Name is required' });
    }

    const result = await permissionModel.create({ name, description });

    await logAudit({
      userId: req.user.user_id,
      actionType: 'CREATE_PERMISSION',
      details: { permission_id: result.permission_id, name },
    });

    res.status(201).json({
      success: true,
      message: 'Permission created successfully',
      permission_id: result.permission_id,
    });
  } catch (err) {
    console.error('Create Permission Error:', err);

    if (err.code === 'DUPLICATE_PERMISSION') {
      return res.status(err.status || 409).json({ code: err.code, message: err.message });
    }

    res.status(500).json({ code: 'CREATE_PERMISSION_FAILED', message: 'Failed to create permission' });
  }
};

exports.updatePermission = async (req, res) => {
  try {
    let { name, description } = req.body || {};
    name = (name || '').trim();
    description = description ?? null;

    if (!name) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Name is required' });
    }

    // ensure exists (optional but clearer 404)
    const existing = await permissionModel.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Permission not found' });
    }

    await permissionModel.update(req.params.id, { name, description });

    await logAudit({
      userId: req.user.user_id,
      actionType: 'UPDATE_PERMISSION',
      details: { permission_id: req.params.id, name },
    });

    res.json({ success: true, message: 'Permission updated successfully' });
  } catch (err) {
    console.error('Update Permission Error:', err);

    if (err.code === 'DUPLICATE_PERMISSION') {
      return res.status(err.status || 409).json({ code: err.code, message: err.message });
    }

    res.status(500).json({ code: 'UPDATE_PERMISSION_FAILED', message: 'Failed to update permission' });
  }
};

exports.deletePermission = async (req, res) => {
  try {
    const result = await permissionModel.remove(req.params.id);

    if (result?.notFound) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Permission not found' });
    }

    await logAudit({
      userId: req.user.user_id,
      actionType: 'DELETE_PERMISSION',
      details: { permission_id: req.params.id },
    });

    res.json({ success: true, message: 'Permission deleted successfully' });
  } catch (err) {
    console.error('Delete Permission Error:', err);

    // Friendly 409 conflicts for “in use”/FK violations surfaced by the model
    if (
      err.code === 'PERMISSION_IN_ROLES' ||
      err.code === 'PERMISSION_IN_USERS' ||
      err.code === 'PERMISSION_FK_BLOCKED'
    ) {
      return res.status(err.status || 409).json({ code: err.code, message: err.message });
    }

    res.status(500).json({ code: 'DELETE_PERMISSION_FAILED', message: 'Failed to delete permission' });
  }
};
