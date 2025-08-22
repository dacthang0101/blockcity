const { withTransaction } = require('../utils/with_transaction.js');

exports.purchaseBlocks = async (req, res) => {
    const userId = req.user.id;
    const blocks = req.body.blocks;

    if (!Array.isArray(blocks) || blocks.length === 0) {
        return res.status(400).json({ error: 'No blocks provided' });
    }

    try {
        // SMELL
        let purchaseId;
        const blockPrice = 100.00;

        await withTransaction(async (client) => {
            // 1. Check if any block has already been purchased
            const conditions = blocks.map((b, i) => ` (x = $${2 * i + 1} AND y = $${2 * i + 2}) `).join(' OR ');
            const values = blocks.flatMap(b => [b.x, b.y]);
            const result = await client.query(
                `SELECT x, y FROM blocks WHERE ${conditions}`,
                values
            );

            if (result.rows.length > 0) {
                throw new Error('Some blocks are already owned');
            }

            // 2. Create purchase
            const totalAmount = blocks.length * blockPrice;

            // Deduct money
            const walletResult = await client.query('SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE', [userId]);
            const wallet = walletResult.rows[0];

            if (wallet.balance < totalAmount) {
                throw new Error('Insufficient balance');
            }

            await client.query('UPDATE wallets SET balance = balance - $1 WHERE id = $2', [totalAmount, wallet.id]);

            // purchases
            const purchaseResult = await client.query(
                `INSERT INTO purchases (user_id, total_price) VALUES ($1, $2) RETURNING id`,
                [userId, totalAmount]
            );
            purchaseId = purchaseResult.rows[0].id;

            // wallet transaction
            await client.query(`
                INSERT INTO wallet_transactions (wallet_id, amount, type, related_purchase_id, note)
                VALUES ($1, $2, 'purchase', $3, $4)
            `, [wallet.id, -totalAmount, purchaseId, `Purchased ${blocks.length} blocks`]);


            // 3. Create purchase_blocks + ownerships
            for (const block of blocks) {
                const { x, y } = block;

                const blockResult = await client.query(
                    `INSERT INTO blocks (x, y) VALUES ($1, $2) RETURNING id`,
                    [x, y]
                );

                const blockId = blockResult.rows[0].id;

                const purchaseBlockResult = await client.query(
                    `INSERT INTO purchase_blocks (purchase_id, block_id, price) VALUES ($1, $2, $3) RETURNING id`,
                    [purchaseId, blockId, blockPrice]
                );

                const purchaseBlockId = purchaseBlockResult.rows[0].id;

                await client.query(
                    `INSERT INTO ownerships (user_id, purchase_id, block_id) VALUES ($1, $2, $3)`,
                    [userId, purchaseId, blockId]
                );

                // await client.query(
                //     `INSERT INTO ownership_logs (user_id, block_id, purchase_block_id, action) VALUES ($1, $2, $3, 'buy')`,
                //     [userId, blockId, purchaseBlockId]
                // );
            }
        });

        res.json({ message: 'Purchase successful', purchaseId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};
