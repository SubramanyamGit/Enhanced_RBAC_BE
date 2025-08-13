const menuModel = require('../models/menu.model');
const logAudit = require('../utils/auditLoggers');

exports.getMenus = async (req, res) => {
  try {
    const menus = await menuModel.getAll();
    await logAudit({
      userId: req.user.user_id,
      actionType: 'VIEW_MENUS',
      details: 'Fetched all menus'
    });
    res.json(menus);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch menus' });
  }
};

exports.createMenu = async (req, res) => {
  try {
    const result = await menuModel.create(req.body);

    await logAudit({
      userId: req.user.user_id,
      actionType: 'CREATE_MENU',
      details: req.body
    });

    res.status(201).json({
      success: true,
      message: 'Menu created successfully',
      id: result.id
    });
  } catch (err) {
    if (err.code === 'DUPLICATE_MENU_KEY') {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to create menu' });
  }
};

exports.updateMenu = async (req, res) => {
  try {
    await menuModel.update(req.params.id, req.body);

    await logAudit({
      userId: req.user.user_id,
      actionType: 'UPDATE_MENU',
      details: { id: req.params.id, ...req.body }
    });

    res.json({ success: true, message: 'Menu updated successfully' });
  } catch (err) {
    if (err.code === 'DUPLICATE_MENU_KEY') {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to update menu' });
  }
};

exports.deleteMenu = async (req, res) => {
  try {
    await menuModel.remove(req.params.id);

    await logAudit({
      userId: req.user.user_id,
      actionType: 'DELETE_MENU',
      details: `Deleted menu ${req.params.id}`
    });

    res.json({ success: true, message: 'Menu deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete menu' });
  }
};
