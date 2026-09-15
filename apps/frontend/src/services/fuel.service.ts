import api from './api';

export interface FuelUpload {
    id: number;
    originalFilename: string;
    month: number;
    year: number;
    totalGallons: number;
    totalValue: number;
    recordsCount: number;
    processedAt: string;
    _count?: {
        logs: number;
    };
}

export interface FuelLog {
    id: number;
    uploadId: number;
    station: string;
    ticketNumber: string | null;
    fuelDate: string;
    fuelTime: string | null;
    vehicleId: number;
    km: number | null;
    product: string;
    gallons: number;
    unitPrice: number;
    totalValue: number;
    driverName: string | null;
    dependency: string | null;
    observations: string | null;
    vehicle?: any;
    createdAt: string;
}

export const fuelService = {
    // Subir archivo Excel
    uploadExcel: async (file: File, month: number, year: number) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post(`/fuel/upload?month=${month}&year=${year}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // Obtener todos los uploads
    getAllUploads: async (): Promise<FuelUpload[]> => {
        const response = await api.get('/fuel/uploads');
        return response.data;
    },

    // Obtener logs de un upload específico
    getLogsByUpload: async (uploadId: number): Promise<FuelLog[]> => {
        const response = await api.get(`/fuel/uploads/${uploadId}/logs`);
        return response.data;
    },

    // Eliminar un upload
    deleteUpload: async (uploadId: number): Promise<void> => {
        await api.delete(`/fuel/uploads/${uploadId}`);
    },

    // Obtener resumen por mes
    getSummaryByMonth: async (month: number, year: number) => {
        const response = await api.get(`/fuel/summary?month=${month}&year=${year}`);
        return response.data;
    },
};