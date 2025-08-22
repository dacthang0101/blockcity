const jwt = require('jsonwebtoken');

exports.authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // {id, username}
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            console.log(`>>> token expired`);
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
};
