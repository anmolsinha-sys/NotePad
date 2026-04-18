import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_LIVE_URL || 'http://localhost:5003';

let socket: Socket | null = null;

type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
const connectionListeners = new Set<(state: ConnectionState) => void>();
let currentState: ConnectionState = 'disconnected';

const notifyState = (state: ConnectionState) => {
    currentState = state;
    connectionListeners.forEach((cb) => cb(state));
};

export const subscribeToConnectionState = (cb: (state: ConnectionState) => void) => {
    connectionListeners.add(cb);
    cb(currentState);
    return () => {
        connectionListeners.delete(cb);
    };
};

export const initiateSocketConnection = () => {
    if (!socket) {
        notifyState('connecting');
        socket = io(SOCKET_URL, {
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 500,
            reconnectionDelayMax: 5000,
            timeout: 10000,
        });

        socket.on('connect', () => notifyState('connected'));
        socket.io.on('reconnect_attempt', () => notifyState('reconnecting'));
        socket.on('disconnect', () => notifyState('disconnected'));
        socket.on('connect_error', () => notifyState('reconnecting'));
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
        notifyState('disconnected');
    }
};

export const joinNoteRoom = (noteId: string, user: { name: string; email: string }) => {
    const s = initiateSocketConnection();
    const payload = { noteId, user };

    const join = () => {
        if (s.connected) {
            s.emit('join-note', payload);
        }
    };

    join();
    s.off('connect', join);
    s.on('connect', join);

    return () => {
        s.off('connect', join);
        if (s.connected) s.emit('leave-note', { noteId });
    };
};

export const emitNoteUpdate = (noteId: string, content: string) => {
    const s = socket || initiateSocketConnection();
    s.emit('update-note', { noteId, content });
};

export const emitTitleUpdate = (noteId: string, title: string) => {
    const s = socket || initiateSocketConnection();
    s.emit('update-title', { noteId, title });
};

const throttle = <T extends (...args: any[]) => void>(fn: T, ms: number) => {
    let last = 0;
    let pendingTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingArgs: any[] | null = null;
    return (...args: Parameters<T>) => {
        const now = Date.now();
        const elapsed = now - last;
        if (elapsed >= ms) {
            last = now;
            fn(...args);
        } else {
            pendingArgs = args;
            if (pendingTimer) return;
            pendingTimer = setTimeout(() => {
                last = Date.now();
                pendingTimer = null;
                if (pendingArgs) fn(...(pendingArgs as Parameters<T>));
                pendingArgs = null;
            }, ms - elapsed);
        }
    };
};

const rawEmitCursorMove = (noteId: string, pos: number, user: any) => {
    if (socket && socket.connected) {
        socket.emit('cursor-move', { noteId, pos, user });
    }
};

export const emitCursorMove = throttle(rawEmitCursorMove, 100);

export const subscribeToNoteUpdate = (callback: (content: string) => void) => {
    const s = initiateSocketConnection();
    s.on('note-updated', callback);
    return () => {
        s.off('note-updated', callback);
    };
};

export const subscribeToTitleUpdate = (callback: (title: string) => void) => {
    const s = initiateSocketConnection();
    s.on('title-updated', callback);
    return () => {
        s.off('title-updated', callback);
    };
};

export const subscribeToUsersUpdate = (callback: (users: any[]) => void) => {
    const s = initiateSocketConnection();
    s.on('users-update', callback);
    return () => {
        s.off('users-update', callback);
    };
};

export const subscribeToCursorMove = (callback: (data: any) => void) => {
    const s = initiateSocketConnection();
    s.on('cursor-moved', callback);
    return () => {
        s.off('cursor-moved', callback);
    };
};

export default socket;
