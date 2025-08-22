const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth.middleware.js');
const purchaseController = require('../controllers/purchase.controller.js');

router.post('/', authMiddleware, purchaseController.purchaseBlocks);

module.exports = router;
