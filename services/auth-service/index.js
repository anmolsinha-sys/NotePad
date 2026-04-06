require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Database Connection
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log('Auth Service: DB Connection Successful!'))
    .catch((err) => console.error('Auth Service: DB Connection Error:', err));

const PORT = process.env.PORT || process.env.PORT_AUTH || 5001;
app.listen(PORT, () => {
    console.log(`Auth Service running on port ${PORT}`);
});
