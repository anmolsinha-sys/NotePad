import { io, Socket } from 'socket.io-client';

const SOCKET_URL = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:5003`
    : 'http://localhost:5003';

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
    if (s.connected) {
        s.emit('join-note', payload);
    } else {
        s.once('connect', () => {
            s.emit('join-note', payload);
        });
    }
};

export const emitNoteUpdate = (noteId: string, content: string) => {
    if (socket) {
        socket.emit('update-note', { noteId, content });
    } else {
        const s = initiateSocketConnection();
        s.emit('update-note', { noteId, content });
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
