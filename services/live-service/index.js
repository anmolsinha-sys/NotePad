const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

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

// rooms: noteId -> Map<socketId, user>
const rooms = new Map();

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
    socket.data.noteIds = new Set();

    socket.on('join-note', ({ noteId, user }) => {
        if (!noteId) return;

        socket.join(noteId);
        socket.data.noteIds.add(noteId);

        if (!rooms.has(noteId)) rooms.set(noteId, new Map());
        const userWithMeta = {
            ...user,
            socketId: socket.id,
            color: getRandomColor(),
        };
        rooms.get(noteId).set(socket.id, userWithMeta);

        io.to(noteId).emit('users-update', uniqueByEmail(Array.from(rooms.get(noteId).values())));
    });

    socket.on('leave-note', ({ noteId }) => {
        if (!noteId) return;
        socket.leave(noteId);
        socket.data.noteIds.delete(noteId);
        leaveRoom(socket, noteId);
    });

    socket.on('update-note', ({ noteId, content }) => {
        if (!noteId) return;
        socket.to(noteId).emit('note-updated', content);
    });

    socket.on('update-title', ({ noteId, title }) => {
        if (!noteId) return;
        socket.to(noteId).emit('title-updated', title);
    });

    socket.on('cursor-move', ({ noteId, pos, user }) => {
        if (!noteId) return;
        socket.to(noteId).emit('cursor-moved', { socketId: socket.id, pos, user });
    });

    socket.on('new-comment', ({ noteId, comment }) => {
        if (!noteId) return;
        socket.to(noteId).emit('comment-added', comment);
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
