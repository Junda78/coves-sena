/**
 * Convierte una fecha UTC a fecha local de Colombia (UTC-5)
 */
export function utcToColombiaDate(utcDate: string | Date): Date {
    const date = new Date(utcDate);

    // Obtener el offset de la zona horaria local
    const offset = date.getTimezoneOffset(); // En minutos

    // Colombia es UTC-5, así que sumamos 5 horas (300 minutos)
    // Pero solo si el offset no es ya -300
    if (offset !== -300) {
        date.setMinutes(date.getMinutes() + offset + 300);
    }

    return date;
}

/**
 * Formatea una fecha UTC a formato legible en Colombia
 */
export function formatColombiaDate(utcDate: string | Date): string {
    const date = utcToColombiaDate(utcDate);
    return date.toLocaleDateString('es-CO');
}

/**
 * Formatea fecha y hora
 */
export function formatColombiaDateTime(utcDate: string | Date): string {
    const date = utcToColombiaDate(utcDate);
    return date.toLocaleString('es-CO');
}