import api from './api';

export interface ChecklistItem {
    category: string;
    itemName: string;
    status: 'SI' | 'NO' | 'NA';
    observation?: string;
}

export interface Checklist {
    id: number;
    vehicleId: number;
    driverId: number;
    checklistDate: string;
    km: number;
    conformityScore: number;
    adminName: string;
    driverName: string;
    observations?: string;
    items: ChecklistItem[];
    vehicle?: any;
    driver?: any;
    createdAt: string;
}

export const checklistsService = {
    getAll: async (): Promise<Checklist[]> => {
        const response = await api.get('/checklists');
        return response.data;
    },

    create: async (data: any): Promise<Checklist> => {
        const response = await api.post('/checklists', data);
        return response.data;
    },

    getByVehicle: async (vehicleId: number): Promise<Checklist[]> => {
        const response = await api.get(`/checklists/vehicle/${vehicleId}`);
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/checklists/${id}`);
    },
};

// Lista maestra de items para el formato GIL-F-035
export const DEFAULT_CHECKLIST_ITEMS = [
    { category: 'DOCUMENTOS', itemName: 'Tarjeta de Propiedad' },
    { category: 'DOCUMENTOS', itemName: 'SOAT Vigente' },
    { category: 'DOCUMENTOS', itemName: 'Revisión Tecnomecánica Vigente' },
    { category: 'DOCUMENTOS', itemName: 'Seguro Obligatorio y Voluntary' },
    { category: 'LUCES', itemName: 'Luces Delanteras (Bajas y Altas)' },
    { category: 'LUCES', itemName: 'Luces Traseras y de Freno' },
    { category: 'LUCES', itemName: 'Direccionales (Delanteras y Traseras)' },
    { category: 'LUCES', itemName: 'Luces de Reversa' },
    { category: 'FRENOS', itemName: 'Freno de Pie (Eficiencia)' },
    { category: 'FRENOS', itemName: 'Freno de Mano (Parqueadero)' },
    { category: 'LLANTAS', itemName: 'Estado y Profundidad de Llantas' },
    { category: 'LLANTAS', itemName: 'Presión de Aire (Incluye Repuesto)' },
    { category: 'FLUIDOS', itemName: 'Nivel de Aceite de Motor' },
    { category: 'FLUIDOS', itemName: 'Nivel de Líquido de Frenos' },
    { category: 'FLUIDOS', itemName: 'Nivel de Refrigerante' },
    { category: 'FLUIDOS', itemName: 'Nivel de Líquido Limpiabrisas' },
    { category: 'EQUIPO_SEGURIDAD', itemName: 'Extintor (Vigente y Cargado)' },
    { category: 'EQUIPO_SEGURIDAD', itemName: 'Kit de Carretera (Gato, Llaves, Triángulos)' },
    { category: 'EQUIPO_SEGURIDAD', itemName: 'Botiquín de Primeros Auxilios' },
    { category: 'CINTURONES', itemName: 'Cinturones de Seguridad (Todos los puestos)' },
    { category: 'ESPEJOS', itemName: 'Espejos Retrovisores (Internos y Externos)' },
    { category: 'LIMPIABRISAS', itemName: 'Estado de las Escobillas' },
    { category: 'PITO', itemName: 'Funcionamiento del Pito/Bocina' },
    { category: 'MANTENIMIENTO', itemName: 'Limpieza General (Interior y Exterior)' },
    { category: 'MANTENIMIENTO', itemName: 'Sin Fugas de Aceite o Fluidos' },
];