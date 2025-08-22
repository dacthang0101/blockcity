const pool = require('../config/db.js');

exports.getBlocksWithOwners = async () => {
    const query = `
        SELECT 
            b.id AS block_id,
            b.x,
            b.y,
            u.id AS user_id,
            u.username,
            u.email
        FROM blocks b
        LEFT JOIN ownerships o ON b.id = o.block_id
        LEFT JOIN users u ON o.user_id = u.id
        ORDER BY b.id;
    `;

    const result = await pool.query(query);
    return result.rows;
};

exports.getBlocksWithOwnersByTile = async (minX, maxX, minY, maxY) => {
    console.log('>>>> minX, maxX, minY, maxY: ', minX, maxX, minY, maxY);
    const query = `
        SELECT 
            b.id AS block_id,
            b.x,
            b.y,
            u.id AS user_id,
            u.username,
            u.email
        FROM blocks b
            LEFT JOIN ownerships o ON b.id = o.block_id
            LEFT JOIN users u ON o.user_id = u.id
        WHERE b.x BETWEEN $1 AND $2
             AND b.y BETWEEN $3 AND $4
        ORDER BY b.id;
    `;

    const result = await pool.query(query, [minX, maxX, minY, maxY]);
    return result.rows;
};