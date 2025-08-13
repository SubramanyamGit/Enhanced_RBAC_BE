const express = require("express");
const router = express.Router();
const authenticate = require("../middlewares/auth.middleware");
const { setPassword } = require("../controllers/set_password.controller");

router.post("/", authenticate, setPassword);

module.exports = router;
