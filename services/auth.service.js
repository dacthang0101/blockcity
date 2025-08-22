const bcrypt = require('bcrypt');
const userRepository = require('../repositories/user.repository.js');
const { OAuth2Client } = require("google-auth-library");

exports.authenticateUser = async (username, password) => {
    const user = await userRepository.findByUsernameWithPassword(username);
    if (!user) {
        throw new Error('User was not found');
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
        throw new Error('Username or Password was incorrect');
    }
    return await userRepository.findById(user.id);
}

exports.authenticateGoogleUser = async (credential) => {
    const googleClient = new OAuth2Client(process.env.GOOGLE_BLOCKCITY_CLIENT_ID);
    const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_BLOCKCITY_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, sub } = payload;

    let user = await userRepository.findByEmailWithPassword(email);
    if (user) {
        return user;
    } else {
        let newUser = await userRepository.createUser(name, email, 'google', sub, 5000);
        return await userRepository.findById(newUser.id);
    }
}

exports.authenticateFacebookUser = async (accessToken) => {
    const appId = process.env.FACEBOOK_BLOCKCITY_APP_ID;
    const appSecret = process.env.FACEBOOK_BLOCKCITY_APP_SECRET;

    const debugRes = await fetch(
        `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`
    );
    const debugData = await debugRes.json();

    if (!debugData.data || !debugData.data.is_valid) {
        return res.status(401).json({ error: "Invalid Facebook token" });
    }

    const profileRes = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
    );
    const profile = await profileRes.json();
    const { id, name, email } = profile;

    let user = await userRepository.findByEmailWithPassword(email);
    if (user) {
        return user;
    } else {
        let newUser = await userRepository.createUser(name, email, 'facebook', id, 5000);
        return await userRepository.findById(newUser.id);
    }
}

// exports.register = async (req, res) => {
//     const { username, password } = req.body;
//     try {
//         const existing = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
//         if (existing.rows.length > 0) return res.status(400).json({ error: 'User already exists' });

//         const hashed = await bcrypt.hash(password, 10);
//         await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashed]);
//         res.status(201).json({ message: 'User created' });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };