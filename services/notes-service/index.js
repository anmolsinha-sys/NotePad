const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const notesController = require('./controllers/notesController');

const app = express();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

app.use(cors({
    origin(origin, cb) {
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));

app.use(express.json({ limit: '2mb' }));

const writeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'fail', message: 'Too many requests. Slow down for a moment.' },
});

// Attach supabase to request
// Optional Auth Middleware for public routes that might still benefit from knowing the user
const optionalProtect = async (req, res, next) => {
    try {
        const auth = req.headers.authorization;
        const token = auth && auth.startsWith('Bearer') ? auth.split(' ')[1] : null;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const { data: user } = await supabase
                .from('users')
                .select('id, email, username')
                .eq('id', decoded.id)
                .single();
            if (user) req.user = user;
        }
        next();
    } catch (err) {
        next();
    }
};

// Attach supabase to every request
app.use((req, res, next) => {
    req.supabase = supabase;
    next();
});

// Auth Middleware (Duplicate of Auth Service Protection for Microservice Independence)
const protect = async (req, res, next) => {
    try {
        const auth = req.headers.authorization;
        const token = auth && auth.startsWith('Bearer') ? auth.split(' ')[1] : null;

        if (!token) {
            return res.status(401).json({ status: 'fail', message: 'Please sign in to continue.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, username')
            .eq('id', decoded.id)
            .single();

        if (error || !user) {
            return res.status(401).json({ status: 'fail', message: 'Session expired. Please sign in again.' });
        }

        req.user = user;
        next();
    } catch (err) {
        res.status(401).json({ status: 'fail', message: 'Session expired. Please sign in again.' });
    }
};

// ... Cloudinary and Routes remain same ...
// Cloudinary Multer Setup
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'notepad_images',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'gif'],
    },
});

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter(req, file, cb) {
        if (ALLOWED_MIMES.has(file.mimetype)) return cb(null, true);
        cb(new Error('Unsupported image format'));
    },
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/notes', protect, notesController.getNotes);
app.get('/api/notes/:id', optionalProtect, notesController.getNote);
app.post('/api/notes', protect, writeLimiter, notesController.createNote);
app.patch('/api/notes/:id', protect, writeLimiter, notesController.updateNote);
app.delete('/api/notes/:id', protect, writeLimiter, notesController.deleteNote);
app.post('/api/upload', protect, writeLimiter, upload.single('image'), notesController.uploadImage);

app.use((err, req, res, next) => {
    if (err && err.message === 'Not allowed by CORS') {
        return res.status(403).json({ status: 'fail', message: 'Origin not allowed.' });
    }
    if (err && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ status: 'fail', message: 'Image must be under 5 MB.' });
    }
    if (err && err.message === 'Unsupported image format') {
        return res.status(400).json({ status: 'fail', message: 'Use JPG, PNG, WEBP, or GIF.' });
    }
    console.error('[notes-service]', err);
    res.status(500).json({ status: 'fail', message: 'Something went wrong.' });
});

console.log('Notes Service: Supabase Client Initialized!');

const PORT = process.env.PORT || process.env.PORT_NOTES || 5002;
app.listen(PORT, () => {
    console.log(`Notes Service running on port ${PORT}`);
});
