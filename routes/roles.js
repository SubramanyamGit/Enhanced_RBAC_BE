const express = require("express");
const router = express.Router();
const controller = require("../controllers/roles.controller");
const authenticate = require("../middlewares/auth.middleware");
const adminOnly = require("../middlewares/adminOnly.middleware");

router.use(authenticate);
router.use(adminOnly);

router.get("/", controller.getRoles);
router.get("/:id", controller.getRoleById);
router.post("/", controller.createRole);
router.patch("/:id", controller.updateRole);
router.delete("/:id", controller.deleteRole);

module.exports = router;
