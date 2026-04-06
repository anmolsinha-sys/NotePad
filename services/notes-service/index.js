require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const notesController = require('./controllers/notesController');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
        req.user = decoded; // Contains the 'id' of the user
        next();
    } catch (err) {
        res.status(401).json({
            status: 'fail',
            message: 'Invalid token. Please log in again!',
        });
    }
};

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
app.get('/api/notes/:id', notesController.getNote); // Publicly accessible for shared workspaces
app.post('/api/notes', protect, notesController.createNote);
app.patch('/api/notes/:id', protect, notesController.updateNote);
app.delete('/api/notes/:id', protect, notesController.deleteNote);
app.post('/api/upload', protect, upload.single('image'), notesController.uploadImage);

// Database Connection
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log('Notes Service: DB Connection Successful!'))
    .catch((err) => console.error('Notes Service: DB Connection Error:', err));

const PORT = process.env.PORT || process.env.PORT_NOTES || 5002;
app.listen(PORT, () => {
    console.log(`Notes Service running on port ${PORT}`);
});
