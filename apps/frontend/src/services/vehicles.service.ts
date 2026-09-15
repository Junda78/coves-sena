import api from './api';

export interface Vehicle {
    id: number;
    plate: string;
    brand: string;
    model: string;
    year: number | null;
    fuelType: 'ACPM' | 'CORRIENTE' | 'EXTRA' | 'GAS';
    currentKm: number;
    chipCode: string | null;
    soatExpiry: string | null;
    tecnoExpiry: string | null;
    insuranceExpiry: string | null;
    status: 'OPERATIVO' | 'REVISAR' | 'TALLER' | 'INACTIVO';
    createdAt: string;
    updatedAt: string;
}

export interface CreateVehicleDto {
    plate: string;
    brand: string;
    model: string;
    year?: number;
    fuelType: string;
    currentKm?: number;
    chipCode?: string;
    soatExpiry?: string;
    tecnoExpiry?: string;
    insuranceExpiry?: string;
    status?: string;
}

export interface UpdateVehicleDto {
    plate?: string;
    brand?: string;
    model?: string;
    year?: number;
    fuelType?: string;
    currentKm?: number;
    chipCode?: string;
    soatExpiry?: string;
    tecnoExpiry?: string;
    insuranceExpiry?: string;
    status?: string;
}

export const vehiclesService = {
    async getAll(): Promise<Vehicle[]> {
        const response = await api.get('/vehicles');
        return response.data;
    },

    async getById(id: number): Promise<Vehicle> {
        const response = await api.get(`/vehicles/${id}`);
        return response.data;
    },

    async getByStatus(status: string): Promise<Vehicle[]> {
        const response = await api.get(`/vehicles/by-status?status=${status}`);
        return response.data;
    },

    async create(data: CreateVehicleDto): Promise<Vehicle> {
        const response = await api.post('/vehicles', data);
        return response.data;
    },

    async update(id: number, data: UpdateVehicleDto): Promise<Vehicle> {
        const response = await api.patch(`/vehicles/${id}`, data);
        return response.data;
    },

    async delete(id: number): Promise<void> {
        await api.delete(`/vehicles/${id}`);
    },

    // ✅ ESTE ES EL MÉTODO QUE FALTA - AGREGALO AQUÍ
    async getExpiring(): Promise<any[]> {
        const response = await api.get('/vehicles/expiring');
        return response.data;
    },
};