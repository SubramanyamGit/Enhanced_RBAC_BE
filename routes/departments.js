const express = require("express");
const router = express.Router();
const departmentsController = require("../controllers/departments.controller");
const authenticate = require("../middlewares/auth.middleware");
const adminOnly = require("../middlewares/adminOnly.middleware");

//Protect all routes below
router.use(authenticate);

// All user routes are admin-only
router.use(adminOnly); 

router.get("/", departmentsController.getDepartments);
router.get("/:id", departmentsController.getDepartmentById);
router.post("/", departmentsController.createDepartment);
router.patch("/:id", departmentsController.updateDepartment);
router.delete("/:id", departmentsController.deleteDepartment);

module.exports = router;
