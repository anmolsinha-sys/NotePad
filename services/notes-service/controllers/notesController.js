const Note = require('../models/Note');
const cloudinary = require('cloudinary').v2;

// Cloudinary Config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.createNote = async (req, res) => {
    try {
        const newNote = await Note.create({
            ...req.body,
            owner: req.user.id,
        });

        res.status(201).json({
            status: 'success',
            data: {
                note: newNote,
            },
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message,
        });
    }
};

exports.getNotes = async (req, res) => {
    try {
        const notes = await Note.find({
            $or: [
                { owner: req.user.id },
                { collaborators: req.user.id },
            ],
        });

        res.status(200).json({
            status: 'success',
            results: notes.length,
            data: {
                notes,
            },
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message,
        });
    }
};

exports.getNote = async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) {
            return res.status(404).json({
                status: 'fail',
                message: 'No note found with that ID',
            });
        }
        res.status(200).json({
            status: 'success',
            data: {
                note,
            },
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message,
        });
    }
};

exports.updateNote = async (req, res) => {
    try {
        const noteId = req.params.id;
        const note = await Note.findById(noteId);

        if (!note) {
            return res.status(404).json({
                status: 'fail',
                message: 'No note found with that ID',
            });
        }

        // Check if user is owner or collaborator
        const isOwner = note.owner.toString() === req.user.id.toString();
        const isCollaborator = note.collaborators.some(
            (c) => c.toString() === req.user.id.toString()
        );

        if (!isOwner && !isCollaborator) {
            return res.status(403).json({
                status: 'fail',
                message: 'You do not have permission to update this note',
            });
        }

        const updatedNote = await Note.findByIdAndUpdate(noteId, req.body, {
            new: true,
            runValidators: true,
        });

        res.status(200).json({
            status: 'success',
            data: {
                note: updatedNote,
            },
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message,
        });
    }
};

exports.deleteNote = async (req, res) => {
    try {
        const noteId = req.params.id;
        const note = await Note.findById(noteId);

        if (!note) {
            return res.status(404).json({
                status: 'fail',
                message: 'No note found with that ID',
            });
        }

        if (note.owner.toString() !== req.user.id.toString()) {
            return res.status(403).json({
                status: 'fail',
                message: 'Only the owner can delete a note',
            });
        }

        await Note.findByIdAndDelete(noteId);
        res.status(204).json({
            status: 'success',
            data: null,
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message,
        });
    }
};

exports.uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please upload an image!',
            });
        }

        // File is already uploaded to Cloudinary via Multer-Storage-Cloudinary
        res.status(200).json({
            status: 'success',
            data: {
                url: req.file.path,
                public_id: req.file.filename,
            },
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message,
        });
    }
};
