import api from './api';

export const dashboardService = {
    // Obtener estadísticas generales
    getStats: async () => {
        const [vehicles, services, _fuelSummary] = await Promise.all([
            api.get('/vehicles').catch(() => ({ data: [] })),
            api.get('/agenda').catch(() => ({ data: [] })),
            api.get('/vehicles').catch(() => ({ data: [] })),
        ]);

        const currentDate = new Date();
        const currentWeek = getWeekNumber(currentDate);
        const currentYear = currentDate.getFullYear();

        // Filtrar vehículos operativos
        const operationalVehicles = vehicles.data.filter(
            (v: any) => v.status === 'OPERATIVO'
        ).length;

        // Filtrar servicios de esta semana
        const weeklyServices = services.data.filter((s: any) =>
            s.weekNumber === currentWeek && s.year === currentYear
        ).length;

        // Filtrar vehículos con vencimientos próximos (30 días)
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const expiringVehicles = vehicles.data.filter((v: any) => {
            const soatExpiry = v.soatExpiry ? new Date(v.soatExpiry) : null;
            const tecnoExpiry = v.tecnoExpiry ? new Date(v.tecnoExpiry) : null;
            const insuranceExpiry = v.insuranceExpiry ? new Date(v.insuranceExpiry) : null;

            return (
                (soatExpiry && soatExpiry <= thirtyDaysFromNow) ||
                (tecnoExpiry && tecnoExpiry <= thirtyDaysFromNow) ||
                (insuranceExpiry && insuranceExpiry <= thirtyDaysFromNow)
            );
        }).length;

        return {
            operationalVehicles,
            weeklyServices,
            expiringVehicles,
        };
    },
};

// Función auxiliar para obtener el número de semana
function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}