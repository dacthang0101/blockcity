const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller.js');

// router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google-login', authController.googleLogin);
router.post('/facebook-login', authController.facebookLogin);

module.exports = router;
