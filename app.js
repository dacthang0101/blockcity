const express = require('express');
require('dotenv').config();
const authRoutes = require('./routes/auth.routes.js');
const meRoutes = require('./routes/me.routes.js');
const purchaseRoutes = require('./routes/purchase.routes.js');
const blockRoutes = require('./routes/block.routes.js');
const cors = require('cors');

const app = express();

// log request
// app.use((req, res, next) => {
//     console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
//     next();
// });

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/me', meRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/block', blockRoutes);

// Error handling
app.use((err, req, res, next) => {
    console.error(err);

    res.status(err.status || 500).json({
        success: false,
        error: {
            code: err.code || "INTERNAL_ERROR",
            message: err.message,
            details: err.details || null
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
