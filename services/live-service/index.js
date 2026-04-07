const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: [process.env.CLIENT_URL || "http://localhost:3000", "http://127.0.0.1:3000"],
        methods: ["GET", "POST"]
    }
});

const rooms = new Map(); // noteId -> Set of users { id, name, color }

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join-note', ({ noteId, user }) => {
        socket.join(noteId);

        if (!rooms.has(noteId)) rooms.set(noteId, new Map());
        const userWithColor = { ...user, socketId: socket.id, color: getRandomColor() };
        rooms.get(noteId).set(socket.id, userWithColor);

        console.log(`User ${user?.name || 'Anonymous'} joined note ${noteId}`);
        io.to(noteId).emit('users-update', Array.from(rooms.get(noteId).values()));
    });

    socket.on('update-note', ({ noteId, content }) => {
        socket.to(noteId).emit('note-updated', content);
    });

    socket.on('update-title', ({ noteId, title }) => {
        socket.to(noteId).emit('title-updated', title);
    });

    socket.on('cursor-move', ({ noteId, pos, user }) => {
        socket.to(noteId).emit('cursor-moved', { socketId: socket.id, pos, user });
    });

    socket.on('disconnect', () => {
        rooms.forEach((users, noteId) => {
            if (users.has(socket.id)) {
                users.delete(socket.id);
                io.to(noteId).emit('users-update', Array.from(users.values()));
            }
        });
        console.log('User disconnected:', socket.id);
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
