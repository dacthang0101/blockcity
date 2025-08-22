const meService = require('../services/me.service.js');

exports.get = async (req, res) => {
    const user = await meService.getUserById(req.user.id);
    res.json(user);
};
