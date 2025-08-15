const express = require("express");
const router = express.Router();
const controller = require("../controllers/roles.controller");
const authenticate = require("../middlewares/auth.middleware");
const adminOnly = require("../middlewares/adminOnly.middleware");

router.use(authenticate);

router.get("/", controller.getRoles);
router.get("/:id",adminOnly, controller.getRoleById);
router.post("/",adminOnly, controller.createRole);
router.patch("/:id",adminOnly, controller.updateRole);
router.delete("/:id",adminOnly, controller.deleteRole);

module.exports = router;
