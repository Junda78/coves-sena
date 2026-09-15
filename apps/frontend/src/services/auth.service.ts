import api from './api';

export type User = {
    id: number;
    username: string;
    fullName: string;
    role: string;
    driverId: number | null;
};

export const authService = {
    async login(username: string, password: string) {
        const response = await api.post('/auth/login', { username, password });

        if (response.data.access_token) {
            localStorage.setItem('token', response.data.access_token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }

        return response.data;
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    getCurrentUser(): User | null {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    isAuthenticated(): boolean {
        return !!localStorage.getItem('token');
    },
};