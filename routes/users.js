const express = require("express");
const router = express.Router();
const usersController = require("../controllers/users.controller");
const authenticate = require("../middlewares/auth.middleware");
const adminOnly = require("../middlewares/adminOnly.middleware");

//Protect all routes below
router.use(authenticate);

//Fetch permissions + menu for signed-in user
router.get("/my_permissions", usersController.getMyPermissions);

// CRUD
router.get("/", usersController.getUsers);
router.get("/:id", usersController.getUserById);
router.post("/", adminOnly, usersController.createUser);
router.patch("/:id", adminOnly, usersController.updateUser);
router.delete("/:id", adminOnly, usersController.deleteUser);

module.exports = router;
