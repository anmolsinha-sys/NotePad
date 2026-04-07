import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_LIVE_URL || 'http://localhost:5004';

let socket: Socket | null = null;

export const initiateSocketConnection = () => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            reconnectionAttempts: 5,
            timeout: 10000,
        });

        socket.on('connect', () => {
            console.log('✅ Socket.io Connected:', socket?.id);
        });

        socket.on('connect_error', (err) => {
            console.error('❌ Socket.io Connection Error:', err);
        });
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export const joinNoteRoom = (noteId: string, user: { name: string, email: string }) => {
    const s = initiateSocketConnection();
    const payload = { noteId, user };

    const join = () => {
        if (s.connected) {
            console.log(`📡 Emitting join-note for ${noteId}`);
            s.emit('join-note', payload);
        }
    };

    // Join now if connected
    join();

    // Re-join on every (re)connect
    s.on('connect', join);

    return () => {
        s.off('connect', join);
    };
};

export const emitNoteUpdate = (noteId: string, content: string) => {
    if (socket) {
        socket.emit('update-note', { noteId, content });
    } else {
        const s = initiateSocketConnection();
        s.emit('update-note', { noteId, content });
    }
};

export const emitTitleUpdate = (noteId: string, title: string) => {
    if (socket) {
        socket.emit('update-title', { noteId, title });
    } else {
        const s = initiateSocketConnection();
        s.emit('update-title', { noteId, title });
    }
};

export const emitCursorMove = (noteId: string, pos: number, user: any) => {
    if (socket) {
        socket.emit('cursor-move', { noteId, pos, user });
    }
};

export const subscribeToNoteUpdate = (callback: (content: string) => void) => {
    const s = initiateSocketConnection();
    const handler = (content: string) => {
        callback(content);
    };
    s.on('note-updated', handler);
    return () => s.off('note-updated', handler);
};

export const subscribeToTitleUpdate = (callback: (title: string) => void) => {
    const s = initiateSocketConnection();
    s.on('title-updated', callback);
    return () => s.off('title-updated', callback);
};

export const subscribeToUsersUpdate = (callback: (users: any[]) => void) => {
    const s = initiateSocketConnection();
    s.on('users-update', callback);
    return () => s.off('users-update', callback);
};

export const subscribeToCursorMove = (callback: (data: any) => void) => {
    const s = initiateSocketConnection();
    s.on('cursor-moved', callback);
    return () => s.off('cursor-moved', callback);
};

export default socket;
