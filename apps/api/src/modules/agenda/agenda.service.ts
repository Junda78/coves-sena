import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateAgendaDto, ServiceStatus } from './dto/create-agenda.dto';
import { UpdateAgendaDto } from './dto/update-agenda.dto';
import * as ExcelJS from 'exceljs';

@Injectable()
export class AgendaService {
    constructor(private prisma: PrismaService) { }

    async create(createAgendaDto: CreateAgendaDto) {
        // Verificar si ya existe un servicio en esa fecha y hora para el mismo vehículo
        const existing = await this.prisma.service.findFirst({
            where: {
                serviceDate: new Date(createAgendaDto.serviceDate),
                startTime: createAgendaDto.startTime,
                vehicleId: createAgendaDto.vehicleId,
                status: {
                    not: ServiceStatus.CANCELADO,
                },
            },
        });

        if (existing) {
            throw new ConflictException(
                `Ya existe un servicio programado para el vehículo ${createAgendaDto.vehicleId} el ${createAgendaDto.serviceDate} a las ${createAgendaDto.startTime}`,
            );
        }

        return this.prisma.service.create({
            data: {
                ...createAgendaDto,
                serviceDate: new Date(createAgendaDto.serviceDate),
            },
            include: {
                vehicle: true,
                driver: true,
            },
        });
    }

    async findAll() {
        return this.prisma.service.findMany({
            include: {
                vehicle: true,
                driver: true,
            },
            orderBy: [{ serviceDate: 'asc' }, { startTime: 'asc' }],
        });
    }

    async findOne(id: number) {
        const service = await this.prisma.service.findUnique({
            where: { id },
            include: {
                vehicle: true,
                driver: true,
            },
        });

        if (!service) {
            throw new NotFoundException(`Servicio con ID ${id} no encontrado`);
        }

        return service;
    }

    async update(id: number, updateAgendaDto: UpdateAgendaDto) {
        await this.findOne(id);

        const data: any = { ...updateAgendaDto };

        if (updateAgendaDto.serviceDate) {
            data.serviceDate = new Date(updateAgendaDto.serviceDate);
        }

        return this.prisma.service.update({
            where: { id },
            data,
            include: {
                vehicle: true,
                driver: true,
            },
        });
    }

    async remove(id: number) {
        await this.findOne(id);
        // Soft delete: cambiar estado a CANCELADO en lugar de eliminar
        return this.prisma.service.update({
            where: { id },
            data: { status: ServiceStatus.CANCELADO },
        });
    }

    async getWeeklyAgenda(year: number, weekNumber: number) {
        return this.prisma.service.findMany({
            where: {
                year,
                weekNumber,
                status: {
                    not: ServiceStatus.CANCELADO,
                },
            },
            include: {
                vehicle: true,
                driver: true,
            },
            orderBy: [{ serviceDate: 'asc' }, { startTime: 'asc' }],
        });
    }

    async getServicesByDate(date: Date) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        return this.prisma.service.findMany({
            where: {
                serviceDate: {
                    gte: startDate,
                    lte: endDate,
                },
                status: {
                    not: ServiceStatus.CANCELADO,
                },
            },
            include: {
                vehicle: true,
                driver: true,
            },
            orderBy: { startTime: 'asc' },
        });
    }

    async getServicesByVehicle(vehicleId: number) {
        return this.prisma.service.findMany({
            where: {
                vehicleId,
                status: {
                    not: ServiceStatus.CANCELADO,
                },
            },
            include: {
                driver: true,
            },
            orderBy: [{ serviceDate: 'desc' }, { startTime: 'desc' }],
        });
    }

    async getServicesByDriver(driverId: number) {
        return this.prisma.service.findMany({
            where: {
                driverId,
                status: {
                    not: ServiceStatus.CANCELADO,
                },
            },
            include: {
                vehicle: true,
                driver: true,
            },
            orderBy: [{ serviceDate: 'asc' }, { startTime: 'asc' }],
        });
    }

    async completeService(id: number, kmEnd?: number) {
        const service = await this.findOne(id);

        const updateData: any = {
            status: ServiceStatus.COMPLETADO,
        };

        if (kmEnd !== undefined) {
            updateData.kmEnd = kmEnd;
        }

        return this.prisma.service.update({
            where: { id },
            data: updateData,
            include: {
                vehicle: true,
                driver: true,
            },
        });
    }

    // MÉTODO PARA EXPORTAR REPORTE GIL-F-034
    async exportMonthlyReport(vehicleId: number, month: number, year: number) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const services = await this.prisma.service.findMany({
            where: {
                vehicleId,
                serviceDate: { gte: startDate, lte: endDate },
                status: { not: ServiceStatus.CANCELADO },
            },
            include: { vehicle: true, driver: true },
            orderBy: [{ serviceDate: 'asc' }, { startTime: 'asc' }],
        });

        if (services.length === 0) {
            throw new NotFoundException(`No hay servicios registrados para el vehículo en el mes ${month}/${year}`);
        }

        const vehicle = services[0].vehicle;
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('GIL-F-034');

        // Configurar anchos de columna
        worksheet.columns = [
            { width: 25 }, { width: 30 }, { width: 15 }, { width: 15 },
            { width: 15 }, { width: 15 }, { width: 15 }, { width: 20 },
            { width: 20 }, { width: 15 }, { width: 15 },
        ];

        // Bordes
        const fullBorder = {
            top: { style: 'thin' as const, color: { argb: 'FF000000' } },
            left: { style: 'thin' as const, color: { argb: 'FF000000' } },
            bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
            right: { style: 'thin' as const, color: { argb: 'FF000000' } },
        };

        const headerFont = { bold: true, size: 11, name: 'Arial' };
        const headerAlignment = { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true };
        const headerFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE0E0E0' } };

        // ===== ENCABEZADOS INSTITUCIONALES (filas 1-3) =====
        const institutionalHeaders = [
            'SERVICIO NACIONAL DE APRENDIZAJE',
            'GESTION DE INFRAESTRUCTURA Y LOGISTICA',
            'FORMATO CONTROL DE ACTIVIDADES PARQUE AUTOMOTOR',
        ];

        institutionalHeaders.forEach((text, index) => {
            const row = index + 1;
            worksheet.mergeCells(`A${row}:K${row}`);
            const cell = worksheet.getCell(`A${row}`);
            cell.value = text;
            cell.font = { bold: true, size: 14, name: 'Arial' };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = fullBorder;
            worksheet.getRow(row).height = 25;
        });

        // Fila vacía
        worksheet.getRow(4).height = 10;

        // ===== INFORMACIÓN DEL REPORTE (filas 5-8) =====
        const infoData = [
            { label: 'NOMBRE REGIONAL', value: 'REGIONAL VALLE', labelRight: 'PLACA DEL VEHICULO', valueRight: vehicle.plate },
            { label: 'CENTRO DE FORMACIÓN', value: 'CENTRO DE GESTIÓN TECNOLÓGICA DE SERVICIOS', labelRight: 'MES DE REPORTE', valueRight: `${monthNames[month - 1]} ${year}` },
            { label: 'CÓDIGO', value: 'GIL-F-034', labelRight: 'KM INICIO MES', valueRight: services[0].kmStart || 0 },
            { label: 'AREA O DEPENDENCIA', value: '', labelRight: 'KM FIN MES', valueRight: services[services.length - 1].kmEnd || services[0].kmStart || 0 },
        ];

        infoData.forEach((info, index) => {
            const row = index + 5;

            worksheet.getCell(`A${row}`).value = info.label;
            worksheet.getCell(`A${row}`).font = { bold: true, size: 10, name: 'Arial' };
            worksheet.getCell(`A${row}`).border = fullBorder;
            worksheet.getCell(`A${row}`).alignment = { vertical: 'middle' };

            worksheet.mergeCells(`B${row}:G${row}`);
            worksheet.getCell(`B${row}`).value = info.value;
            worksheet.getCell(`B${row}`).font = { size: 10, name: 'Arial' };
            worksheet.getCell(`B${row}`).border = fullBorder;
            worksheet.getCell(`B${row}`).alignment = { vertical: 'middle' };

            worksheet.getCell(`H${row}`).value = info.labelRight;
            worksheet.getCell(`H${row}`).font = { bold: true, size: 10, name: 'Arial' };
            worksheet.getCell(`H${row}`).border = fullBorder;
            worksheet.getCell(`H${row}`).alignment = { vertical: 'middle' };

            worksheet.mergeCells(`I${row}:K${row}`);
            worksheet.getCell(`I${row}`).value = info.valueRight;
            worksheet.getCell(`I${row}`).font = { size: 10, name: 'Arial' };
            worksheet.getCell(`I${row}`).border = fullBorder;
            worksheet.getCell(`I${row}`).alignment = { vertical: 'middle' };

            worksheet.getRow(row).height = 25;
        });

        // Fila vacía
        worksheet.getRow(9).height = 10;

        // ===== ENCABEZADOS DE TABLA (fila 10) =====
        const tableHeaders = ['DIA', 'NOMBRE CONDUCTOR', 'HORA INICIO', 'ACTIVIDADES', 'HORA FIN'];
        const headerRow = 10;

        worksheet.mergeCells(`D${headerRow}:G${headerRow}`);

        const colLetters = ['A', 'B', 'C', 'D', 'H'];
        tableHeaders.forEach((header, index) => {
            const col = colLetters[index];
            const cell = worksheet.getCell(`${col}${headerRow}`);
            cell.value = header;
            cell.font = headerFont;
            cell.alignment = headerAlignment;
            cell.border = fullBorder;
            cell.fill = headerFill;
        });

        // Bordes para columnas E, F, G (parte de ACTIVIDADES combinadas)
        ['E', 'F', 'G'].forEach(col => {
            const cell = worksheet.getCell(`${col}${headerRow}`);
            cell.border = fullBorder;
            cell.fill = headerFill;
        });

        worksheet.getRow(headerRow).height = 30;

        // ===== DATOS DE SERVICIOS =====
        let currentRow = 11;
        services.forEach((service) => {
            const date = new Date(service.serviceDate);
            const dayName = date.toLocaleDateString('es-CO', { weekday: 'long' });
            const dayCapitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);

            worksheet.getCell(`A${currentRow}`).value = `${dayCapitalized} ${date.getDate()}`;
            worksheet.getCell(`A${currentRow}`).font = { size: 10, name: 'Arial' };
            worksheet.getCell(`A${currentRow}`).border = fullBorder;
            worksheet.getCell(`A${currentRow}`).alignment = { vertical: 'middle' };

            worksheet.getCell(`B${currentRow}`).value = service.driver?.fullName || 'N/A';
            worksheet.getCell(`B${currentRow}`).font = { size: 10, name: 'Arial' };
            worksheet.getCell(`B${currentRow}`).border = fullBorder;
            worksheet.getCell(`B${currentRow}`).alignment = { vertical: 'middle' };

            worksheet.getCell(`C${currentRow}`).value = service.startTime;
            worksheet.getCell(`C${currentRow}`).font = { size: 10, name: 'Arial' };
            worksheet.getCell(`C${currentRow}`).border = fullBorder;
            worksheet.getCell(`C${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

            worksheet.mergeCells(`D${currentRow}:G${currentRow}`);
            worksheet.getCell(`D${currentRow}`).value = `${service.title}${service.destination ? ` - ${service.destination}` : ''}`;
            worksheet.getCell(`D${currentRow}`).font = { size: 10, name: 'Arial' };
            worksheet.getCell(`D${currentRow}`).border = fullBorder;
            worksheet.getCell(`D${currentRow}`).alignment = { vertical: 'middle', wrapText: true };

            worksheet.getCell(`H${currentRow}`).value = service.endTime || '';
            worksheet.getCell(`H${currentRow}`).font = { size: 10, name: 'Arial' };
            worksheet.getCell(`H${currentRow}`).border = fullBorder;
            worksheet.getCell(`H${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

            ['I', 'J', 'K'].forEach(col => {
                worksheet.getCell(`${col}${currentRow}`).border = fullBorder;
            });

            worksheet.getRow(currentRow).height = 25;
            currentRow++;
        });

        // Rellenar filas vacías hasta la fila 35
        while (currentRow <= 35) {
            ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].forEach(col => {
                worksheet.getCell(`${col}${currentRow}`).border = fullBorder;
            });
            currentRow++;
        }

        // ===== SECCIÓN DE FIRMAS (fila 36-38) =====
        worksheet.mergeCells('A36:G36');
        worksheet.getCell('A36').value = 'ELABORÓ';
        worksheet.getCell('A36').font = { bold: true, size: 10, name: 'Arial' };
        worksheet.getCell('A36').border = fullBorder;
        worksheet.getCell('A36').alignment = { vertical: 'middle' };
        ['B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
            worksheet.getCell(`${col}36`).border = fullBorder;
        });

        worksheet.mergeCells('H36:K36');
        worksheet.getCell('H36').value = 'REVISÓ';
        worksheet.getCell('H36').font = { bold: true, size: 10, name: 'Arial' };
        worksheet.getCell('H36').border = fullBorder;
        worksheet.getCell('H36').alignment = { vertical: 'middle' };
        ['I', 'J', 'K'].forEach(col => {
            worksheet.getCell(`${col}36`).border = fullBorder;
        });
        worksheet.getRow(36).height = 30;

        // Línea de firma
        worksheet.mergeCells('A37:G37');
        worksheet.getCell('A37').value = '________________________________________';
        worksheet.getCell('A37').font = { size: 10, name: 'Arial' };
        worksheet.getCell('A37').alignment = { horizontal: 'center', vertical: 'middle' };

        worksheet.mergeCells('H37:K37');
        worksheet.getCell('H37').value = '________________________________________';
        worksheet.getCell('H37').font = { size: 10, name: 'Arial' };
        worksheet.getCell('H37').alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(37).height = 40;

        // Código y versión
        worksheet.getCell('A38').value = 'GIL-F-034';
        worksheet.getCell('A38').font = { bold: true, size: 10, name: 'Arial' };
        worksheet.getCell('A38').border = fullBorder;

        worksheet.getCell('B38').value = 'V-002';
        worksheet.getCell('B38').font = { size: 10, name: 'Arial' };
        worksheet.getCell('B38').border = fullBorder;

        ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].forEach(col => {
            worksheet.getCell(`${col}38`).border = fullBorder;
        });

        // ===== CONFIGURACIÓN DE IMPRESIÓN =====
        worksheet.pageSetup = {
            orientation: 'landscape',
            paperSize: 9,
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 1,
            margins: {
                left: 0.5,
                right: 0.5,
                top: 0.5,
                bottom: 0.5,
                header: 0.3,
                footer: 0.3,
            },
        };

        const buffer = await workbook.xlsx.writeBuffer();
        const filename = `GIL-F-034_${vehicle.plate}_${monthNames[month - 1]}_${year}.xlsx`;

        return { buffer, filename };
    }

    async getWeeklyAgendaByDriver(year: number, weekNumber: number, driverId: number) {
        return this.prisma.service.findMany({
            where: {
                year,
                weekNumber,
                driverId,
                status: { not: ServiceStatus.CANCELADO },
            },
            include: { vehicle: true, driver: true },
            orderBy: [{ serviceDate: 'asc' }, { startTime: 'asc' }],
        });
    }

    async getServicesByDateAndDriver(date: Date, driverId: number) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        return this.prisma.service.findMany({
            where: {
                serviceDate: { gte: startDate, lte: endDate },
                driverId,
                status: { not: ServiceStatus.CANCELADO },
            },
            include: { vehicle: true, driver: true },
            orderBy: { startTime: 'asc' },
        });
    }
}