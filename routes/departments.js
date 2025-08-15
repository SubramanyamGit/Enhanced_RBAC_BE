const express = require("express");
const router = express.Router();
const departmentsController = require("../controllers/departments.controller");
const authenticate = require("../middlewares/auth.middleware");
const adminOnly = require("../middlewares/adminOnly.middleware");

//Protect all routes below
router.use(authenticate);


router.get("/", departmentsController.getDepartments);
router.get("/:id", adminOnly,departmentsController.getDepartmentById);
router.post("/", adminOnly,departmentsController.createDepartment);
router.patch("/:id", adminOnly,departmentsController.updateDepartment);
router.delete("/:id",adminOnly, departmentsController.deleteDepartment);

module.exports = router;
