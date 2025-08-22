const pool = require('../config/db.js');

exports.findById = async (id) => {
    const result = await pool.query('SELECT id, username, email, provider, provider_id, created_at, updated_at FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
}

exports.findByUsernameWithPassword = async (username) => {
    const result = await pool.query(`
        SELECT * 
        FROM users 
        WHERE username = $1`,
        [username]
    );
    return result.rows[0] || null;
}

exports.findByEmailWithPassword = async (email) => {
    const result = await pool.query(`
        SELECT * 
        FROM users 
        WHERE email = $1`,
        [email]
    );
    return result.rows[0] || null;
}

exports.findProfileById = async (id) => {
    const result = await pool.query(`
        SELECT 
            u.id, 
            u.username, 
            u.email, 
            u.provider, 
            u.provider_id, 
            u.created_at, 
            u.updated_at,
            w.balance
        FROM users u
        LEFT JOIN wallets w ON u.id = w.user_id
        WHERE u.id = $1
    `, [id]);

    return result.rows[0] || null;
};

exports.findOrCreateGoogleUser = async (email, name, providerId) => {

    const query = `
        INSERT INTO users (email, provider, provider_id, username)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO UPDATE
        SET provider = EXCLUDED.provider,
            provider_id = EXCLUDED.provider_id,
            updated_at = NOW()
        RETURNING id, username, email, provider, provider_id, created_at, updated_at;
  `;

    const values = [email, 'google', providerId, name];

    const result = await pool.query(query, values);
    return result.rows[0];
};

exports.createUser = async (username, email, provider, providerId, balance) => {
    const insertUser = await pool.query(
        `INSERT INTO users (email, provider, provider_id, username)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
        [email, provider, providerId, username]
    );

    const newUser = insertUser.rows[0];

    await pool.query(
        `INSERT INTO wallets (user_id, balance) VALUES ($1, $2)`,
        [newUser.id, balance]
    );

    return newUser;
}