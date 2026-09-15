import api from './api';

export interface Driver {
    id: number;
    fullName: string;
    document: string;
    licenseNumber: string | null;
    licenseCategory: string | null;
    licenseExpiry: string | null;
    phone: string | null;
    active: boolean;
    userId: number | null;
    createdAt: string;
}

export const driversService = {
    getAll: async (): Promise<Driver[]> => {
        const response = await api.get('/drivers');
        return response.data;
    },

    getById: async (id: number): Promise<Driver> => {
        const response = await api.get(`/drivers/${id}`);
        return response.data;
    },

    create: async (data: Partial<Driver>): Promise<Driver> => {
        const response = await api.post('/drivers', data);
        return response.data;
    },

    update: async (id: number, data: Partial<Driver>): Promise<Driver> => {
        const response = await api.patch(`/drivers/${id}`, data);
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/drivers/${id}`);
    },
};