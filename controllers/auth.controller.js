const jwt = require('jsonwebtoken');
const authService = require('../services/auth.service.js');

exports.login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await authService.authenticateUser(username, password);
        const token = jwt.sign(
            {
                id: user.id
            },
            process.env.JWT_SECRET,
        );
        res.json({ token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


exports.googleLogin = async (req, res) => {
    const { credential } = req.body;
    try {
        const user = await authService.authenticateGoogleUser(credential);
        const token = jwt.sign(
            {
                id: user.id
            },
            process.env.JWT_SECRET,
        );
        res.json({ token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.facebookLogin = async (req, res) => {
    const { accessToken } = req.body;
    try {
        const user = await authService.authenticateFacebookUser(accessToken);
        const token = jwt.sign(
            {
                id: user.id
            },
            process.env.JWT_SECRET,
        );
        res.json({ token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};