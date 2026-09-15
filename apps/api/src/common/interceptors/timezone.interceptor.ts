import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TimezoneInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            map((data) => this.convertDatesToBogota(data)),
        );
    }

    private convertDatesToBogota(obj: any): any {
        if (!obj) return obj;

        // Si es un array, procesar cada elemento
        if (Array.isArray(obj)) {
            return obj.map((item) => this.convertDatesToBogota(item));
        }

        // Si es un objeto, procesar sus propiedades
        if (typeof obj === 'object') {
            const newObj = { ...obj };

            for (const key in newObj) {
                const value = newObj[key];

                // Si es un campo de fecha, convertirlo
                if (this.isDateField(key, value)) {
                    newObj[key] = this.toBogotaISO(value);
                } else if (typeof value === 'object' && value !== null) {
                    // Recursividad para objetos anidados (vehicle, driver, etc.)
                    newObj[key] = this.convertDatesToBogota(value);
                }
            }

            return newObj;
        }

        return obj;
    }

    private isDateField(key: string, value: any): boolean {
        // Lista de campos que son fechas en tu sistema
        const dateFields = [
            'date',
            'checklistDate',
            'createdAt',
            'updatedAt',
            'created_at',
            'updated_at',
            'license_expiry',
            'soat_expiry',
            'tecno_expiry',
            'insurance_expiry',
            'startDate',
            'endDate',
            'startTime',
            'endTime',
        ];

        return (
            dateFields.some((field) => key.toLowerCase().includes(field.toLowerCase())) ||
            value instanceof Date ||
            (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value))
        );
    }

    private toBogotaISO(value: any): string {
        try {
            const date = value instanceof Date ? value : new Date(value);

            if (isNaN(date.getTime())) return value;

            // Obtener componentes de fecha en zona horaria de Bogotá
            const formatter = new Intl.DateTimeFormat('es-CO', {
                timeZone: 'America/Bogota',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            });

            const parts = formatter.formatToParts(date);
            const getPart = (type: string) => parts.find(p => p.type === type)?.value;

            const year = getPart('year');
            const month = getPart('month');
            const day = getPart('day');
            const hour = getPart('hour');
            const minute = getPart('minute');
            const second = getPart('second');

            // Retornar en formato ISO pero con hora de Bogotá
            return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
        } catch (error) {
            return value;
        }
    }
}