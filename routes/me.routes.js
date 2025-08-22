const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth.middleware.js');
const meController = require('../controllers/me.controller.js');
const asyncHandler = require('../utils/async_handler.js');

router.get('/', authMiddleware, asyncHandler(meController.get));

module.exports = router;
