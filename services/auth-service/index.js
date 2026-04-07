const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();

// Supabase Client Initialization
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// Middlewares
app.use(cors());
app.use(express.json());

// Attach supabase to request
app.use((req, res, next) => {
    req.supabase = supabase;
    next();
});

// Routes
app.use('/api/auth', authRoutes);

console.log('Auth Service: Supabase Client Initialized!');

const PORT = process.env.PORT || process.env.PORT_AUTH || 5001;
app.listen(PORT, () => {
    console.log(`Auth Service running on port ${PORT}`);
});
