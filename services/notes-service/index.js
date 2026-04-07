const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const notesController = require('./controllers/notesController');

const app = express();

// Supabase Client Initialization
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Attach supabase to request
// Optional Auth Middleware for public routes that might still benefit from knowing the user
const optionalProtect = async (req, res, next) => {
    try {
        let token;
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const { data: user } = await supabase
                .from('users')
                .select('id')
                .eq('id', decoded.id)
                .single();
            if (user) req.user = user;
        }
        next();
    } catch (err) {
        next(); // Ignore errors for optional protect
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
        let token;
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                status: 'fail',
                message: 'You are not logged in! Please log in to get access.',
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if user still exists in Supabase
        const { data: user, error } = await supabase
            .from('users')
            .select('id')
            .eq('id', decoded.id)
            .single();

        if (error || !user) {
            return res.status(401).json({
                status: 'fail',
                message: 'The user belonging to this token no longer exists.',
            });
        }

        req.user = decoded; // Contains the 'id' of the user
        next();
    } catch (err) {
        res.status(401).json({
            status: 'fail',
            message: 'Invalid token. Please log in again!',
        });
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
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    },
});

const upload = multer({ storage: storage });

// Routes
app.get('/api/notes', protect, notesController.getNotes);
app.get('/api/notes/:id', optionalProtect, notesController.getNote); // Publicly accessible for shared workspaces
app.post('/api/notes', protect, notesController.createNote);
app.patch('/api/notes/:id', protect, notesController.updateNote);
app.delete('/api/notes/:id', protect, notesController.deleteNote);
app.post('/api/upload', protect, upload.single('image'), notesController.uploadImage);

console.log('Notes Service: Supabase Client Initialized!');

const PORT = process.env.PORT || process.env.PORT_NOTES || 5002;
app.listen(PORT, () => {
    console.log(`Notes Service running on port ${PORT}`);
});
