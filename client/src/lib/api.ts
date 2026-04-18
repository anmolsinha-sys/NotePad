import axios from 'axios';
import Cookies from 'js-cookie';

const AUTH_URL = (process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:5001') + '/api/auth';
const NOTES_URL = (process.env.NEXT_PUBLIC_NOTES_URL || 'http://localhost:5002') + '/api';

const api = axios.create({
    baseURL: NOTES_URL,
});

// Interceptor to add token to requests
api.interceptors.request.use((config) => {
    const token = Cookies.get('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const authApi = {
    signup: (data: any) => axios.post(`${AUTH_URL}/signup`, data),
    login: (data: any) => axios.post(`${AUTH_URL}/login`, data),
    validate: () => {
        const token = Cookies.get('token');
        return axios.get(`${AUTH_URL}/validate`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },
    deleteAccount: () => {
        const token = Cookies.get('token');
        return axios.delete(`${AUTH_URL}/account`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },
};

export const notesApi = {
    getNotes: () => api.get('/notes'),
    getNote: (id: string) => api.get(`/notes/${id}`),
    createNote: (data: any) => api.post('/notes', data),
    updateNote: (id: string, data: any) => api.patch(`/notes/${id}`, data),
    deleteNote: (id: string) => api.delete(`/notes/${id}`),
    uploadImage: (formData: FormData) => api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    inviteCollaborator: (id: string, email: string, role: 'editor' | 'viewer' = 'editor') =>
        api.post(`/notes/${id}/invite`, { email, role }),
    removeCollaborator: (id: string, userId: string) => api.delete(`/notes/${id}/collaborators/${userId}`),
    searchNotes: (q: string) => api.get(`/notes/search`, { params: { q } }),
    listVersions: (id: string) => api.get(`/notes/${id}/versions`),
    restoreVersion: (id: string, versionId: string) => api.post(`/notes/${id}/versions/${versionId}/restore`),
    urlMeta: (url: string) => api.get(`/url-meta`, { params: { url } }),
};

export default api;
