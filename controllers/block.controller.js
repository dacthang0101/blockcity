const blockService = require('../services/block.service.js');

exports.list = async (req, res) => {
    try {
        const blocks = await blockService.listBlocks();
        res.json(blocks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.listByTile = async (req, res) => {
    try {
        const { tileX, tileY } = req.query;
        const blocks = await blockService.listBlocksByTile(tileX, tileY);
        res.json(blocks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
