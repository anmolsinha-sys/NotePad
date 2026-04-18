const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const app = express();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY,
);

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000,http://127.0.0.1:3000')
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

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// ─── Socket auth middleware ───────────────────────────────────────────────
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) return next(new Error('Auth required'));

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, username')
            .eq('id', decoded.id)
            .single();

        if (error || !user) return next(new Error('Invalid session'));

        socket.data.user = user;
        next();
    } catch (err) {
        next(new Error('Invalid session'));
    }
});

// ─── Access helpers ───────────────────────────────────────────────────────
const userCanAccessNote = async (noteId, userId) => {
    const { data: note } = await supabase
        .from('notes')
        .select('owner_id, collaborators, viewers, is_public')
        .eq('id', noteId)
        .single();
    if (!note) return { ok: false, canEdit: false };

    const isOwner = note.owner_id === userId;
    const isViewer = Array.isArray(note.viewers) && note.viewers.includes(userId);
    const isEditor = Array.isArray(note.collaborators) && note.collaborators.includes(userId);

    if (isOwner) return { ok: true, canEdit: true };
    if (isViewer) return { ok: true, canEdit: false };
    if (isEditor) return { ok: true, canEdit: true };
    if (note.is_public) return { ok: true, canEdit: false };
    return { ok: false, canEdit: false };
};

const rooms = new Map(); // noteId -> Map<socketId, user>

const uniqueByEmail = (users) => {
    const seen = new Map();
    for (const u of users) {
        const key = (u.email || u.socketId).toLowerCase();
        if (!seen.has(key)) seen.set(key, u);
    }
    return Array.from(seen.values());
};

const leaveRoom = (socket, noteId) => {
    const users = rooms.get(noteId);
    if (!users) return;
    if (users.delete(socket.id) && users.size === 0) {
        rooms.delete(noteId);
        return;
    }
    io.to(noteId).emit('users-update', uniqueByEmail(Array.from(users.values())));
};

io.on('connection', (socket) => {
    socket.data.noteAccess = new Map(); // noteId -> { canEdit }
    socket.data.noteIds = new Set();

    socket.on('join-note', async ({ noteId }) => {
        if (!noteId || typeof noteId !== 'string') return;
        const access = await userCanAccessNote(noteId, socket.data.user.id);
        if (!access.ok) return; // silently ignore unauthorized

        socket.join(noteId);
        socket.data.noteIds.add(noteId);
        socket.data.noteAccess.set(noteId, { canEdit: access.canEdit });

        if (!rooms.has(noteId)) rooms.set(noteId, new Map());
        const user = socket.data.user;
        const presence = {
            name: user.username || 'User',
            email: user.email,
            id: user.id,
            socketId: socket.id,
            color: getRandomColor(),
        };
        rooms.get(noteId).set(socket.id, presence);

        io.to(noteId).emit('users-update', uniqueByEmail(Array.from(rooms.get(noteId).values())));
    });

    socket.on('leave-note', ({ noteId }) => {
        if (!noteId) return;
        socket.leave(noteId);
        socket.data.noteIds.delete(noteId);
        socket.data.noteAccess.delete(noteId);
        leaveRoom(socket, noteId);
    });

    socket.on('update-note', ({ noteId, content }) => {
        const access = socket.data.noteAccess.get(noteId);
        if (!access || !access.canEdit) return;
        if (typeof content !== 'string') return;
        socket.to(noteId).emit('note-updated', content);
    });

    socket.on('update-title', ({ noteId, title }) => {
        const access = socket.data.noteAccess.get(noteId);
        if (!access || !access.canEdit) return;
        if (typeof title !== 'string') return;
        socket.to(noteId).emit('title-updated', title);
    });

    socket.on('cursor-move', ({ noteId, pos }) => {
        const access = socket.data.noteAccess.get(noteId);
        if (!access) return;
        if (typeof pos !== 'number') return;
        // Server supplies the authenticated user — ignore any client-sent user
        socket.to(noteId).emit('cursor-moved', {
            socketId: socket.id,
            pos,
            user: { name: socket.data.user.username, id: socket.data.user.id },
        });
    });

    socket.on('new-comment', ({ noteId, comment }) => {
        const access = socket.data.noteAccess.get(noteId);
        if (!access) return; // viewers & editors can read; owner-less public notes don't broadcast
        if (!comment || typeof comment !== 'object') return;
        // Re-stamp the author from the authenticated socket; clients cannot spoof
        const safe = {
            id: comment.id,
            body: typeof comment.body === 'string' ? comment.body.slice(0, 2000) : '',
            created_at: comment.created_at || new Date().toISOString(),
            author_id: socket.data.user.id,
            author: socket.data.user.username || 'Someone',
        };
        socket.to(noteId).emit('comment-added', safe);
    });

    socket.on('disconnect', () => {
        for (const noteId of socket.data.noteIds) {
            leaveRoom(socket, noteId);
        }
    });
});

function getRandomColor() {
    const colors = ['#f87171', '#fb923c', '#fbbf24', '#facc15', '#a3e635', '#4ade80', '#34d399', '#2dd4bf', '#22d3ee', '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185'];
    return colors[Math.floor(Math.random() * colors.length)];
}

const PORT = process.env.PORT || process.env.PORT_LIVE || 5003;
server.listen(PORT, () => {
    console.log(`Live Service running on port ${PORT}`);
});
