const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth.middleware.js');
const blockController = require('../controllers/block.controller.js');

router.get('/', blockController.list);

router.get('/tile', blockController.listByTile);

module.exports = router;
