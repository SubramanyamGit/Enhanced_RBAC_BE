module.exports = (req, res, next) => {
  const role = req.user?.role;

  if (!role || !["admin", "super admin"].includes(role.toLowerCase())) {
    return res.status(403).json({ error: "Access denied: Admins only" });
  }

  next();
};
