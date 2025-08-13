const express = require("express");
const router = express.Router();
const signInController = require("../controllers/sign_in.controller");

router.post("/", signInController.signIn);
router.post('/forgot-password', signInController.forgotPassword);

module.exports = router;
