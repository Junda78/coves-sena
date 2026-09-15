import api from './api';

export interface AgendaService {
    id: number;
    serviceDate: string;
    startTime: string;
    endTime: string | null;
    vehicleId: number;
    driverId: number;
    activityType: string;
    title: string;
    destination: string | null;
    kmStart: number | null;
    kmEnd: number | null;
    requester: string | null;
    status: string;
    weekNumber: number;
    year: number;
    vehicle?: any;
    driver?: any;
    createdAt: string;
}

export const agendaService = {
    getAll: async (): Promise<AgendaService[]> => {
        const response = await api.get('/agenda');
        return response.data;
    },

    getWeekly: async (year: number, week: number): Promise<AgendaService[]> => {
        const response = await api.get(`/agenda/weekly?year=${year}&week=${week}`);
        return response.data;
    },

    create: async (data: Partial<AgendaService>): Promise<AgendaService> => {
        const response = await api.post('/agenda', data);
        return response.data;
    },

    update: async (id: number, data: Partial<AgendaService>): Promise<AgendaService> => {
        const response = await api.patch(`/agenda/${id}`, data);
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/agenda/${id}`);
    },
};