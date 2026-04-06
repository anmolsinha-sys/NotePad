const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        default: 'Untitled Note',
    },
    content: {
        type: String, // HTML content for rich text
        required: true,
        default: '',
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    collaborators: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
    tags: [
        {
            type: String,
            trim: true,
        },
    ],
    type: {
        type: String,
        enum: ['rich-text', 'code'],
        default: 'rich-text',
    },
    language: {
        type: String, // for code snippets
        default: 'javascript',
    },
    images: [
        {
            url: String,
            public_id: String,
        },
    ],
    isPublic: {
        type: Boolean,
        default: false,
    },
    isPinned: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

noteSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Note', noteSchema);
