import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ChecklistsService {
    constructor(private prisma: PrismaService) { }

    async create(createChecklistDto: CreateChecklistDto) {
        const { items, ...checklistData } = createChecklistDto;

        return this.prisma.checklist.create({
            data: {
                ...checklistData,
                checklistDate: new Date(checklistData.checklistDate),
                items: {
                    create: items.map((item) => ({
                        category: item.category,
                        itemName: item.itemName,
                        status: item.status,
                        observation: item.observation,
                    })),
                },
            },
            include: {
                items: true,
                vehicle: true,
                driver: true,
            },
        });
    }

    async findAll() {
        return this.prisma.checklist.findMany({
            include: {
                items: true,
                vehicle: true,
                driver: true,
            },
            orderBy: { checklistDate: 'desc' },
        });
    }

    async findOne(id: number) {
        const checklist = await this.prisma.checklist.findUnique({
            where: { id },
            include: {
                items: true,
                vehicle: true,
                driver: true,
            },
        });

        if (!checklist) {
            throw new NotFoundException(`Checklist con ID ${id} no encontrado`);
        }

        return checklist;
    }

    async update(id: number, updateChecklistDto: UpdateChecklistDto) {
        await this.findOne(id);

        const { items, ...checklistData } = updateChecklistDto;

        const data: any = { ...checklistData };
        if (checklistData.checklistDate) {
            data.checklistDate = new Date(checklistData.checklistDate);
        }

        const updateOps: any = { data };

        if (items) {
            updateOps.data.items = {
                deleteMany: { checklistId: id },
                create: items.map((item) => ({
                    category: item.category,
                    itemName: item.itemName,
                    status: item.status,
                    observation: item.observation,
                })),
            };
        }

        return this.prisma.checklist.update({
            where: { id },
            ...updateOps,
            include: {
                items: true,
                vehicle: true,
                driver: true,
            },
        });
    }

    async remove(id: number) {
        await this.findOne(id);
        return this.prisma.checklist.delete({
            where: { id },
        });
    }

    async getByVehicle(vehicleId: number) {
        return this.prisma.checklist.findMany({
            where: { vehicleId },
            include: {
                items: true,
                driver: true,
            },
            orderBy: { checklistDate: 'desc' },
        });
    }

    async getByDriver(driverId: number) {
        return this.prisma.checklist.findMany({
            where: { driverId },
            include: {
                items: true,
                vehicle: true,
            },
            orderBy: { checklistDate: 'desc' },
        });
    }

    async getByDate(date: string) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        return this.prisma.checklist.findMany({
            where: {
                checklistDate: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                items: true,
                vehicle: true,
                driver: true,
            },
            orderBy: { checklistDate: 'desc' },
        });
    }

    async getChecklistsWithIssues() {
        return this.prisma.checklist.findMany({
            where: {
                items: {
                    some: {
                        status: 'NO',
                    },
                },
            },
            include: {
                items: {
                    where: { status: 'NO' },
                },
                vehicle: true,
                driver: true,
            },
            orderBy: { checklistDate: 'desc' },
        });
    }

    async exportGIL041(id: number) {
        const checklist = await this.prisma.checklist.findUnique({
            where: { id },
            include: { vehicle: true, driver: true, items: true },
        });

        if (!checklist) throw new NotFoundException('Checklist no encontrado');

        // 🔍 DEBUG: Verificar si hay firma
        console.log('📋 Checklist ID:', id);
        console.log('✍️  ¿Tiene firma?', !!checklist.signature);
        console.log('📏 Longitud de la firma:', checklist.signature?.length || 0);
        if (checklist.signature) {
            console.log('🔍 Primeros 50 chars de la firma:', checklist.signature.substring(0, 50));
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('GIL-F-041');

        worksheet.columns = [
            { width: 40 }, { width: 12 }, { width: 12 }, { width: 40 }
        ];

        const fullBorder: Partial<ExcelJS.Borders> = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } },
        };

        const thickBorder: Partial<ExcelJS.Borders> = {
            top: { style: 'medium', color: { argb: 'FF000000' } },
            left: { style: 'medium', color: { argb: 'FF000000' } },
            bottom: { style: 'medium', color: { argb: 'FF000000' } },
            right: { style: 'medium', color: { argb: 'FF000000' } },
        };

        const centerAlign: Partial<ExcelJS.Alignment> = {
            horizontal: 'center',
            vertical: 'middle',
            wrapText: true,
        };

        const leftAlign: Partial<ExcelJS.Alignment> = {
            horizontal: 'left',
            vertical: 'middle',
            wrapText: true,
        };

        const headerFont: Partial<ExcelJS.Font> = { bold: true, size: 11, name: 'Arial' };
        const bigTitleFont: Partial<ExcelJS.Font> = { bold: true, size: 14, name: 'Arial' };

        // 1. ENCABEZADO
        worksheet.mergeCells('A1:A4');
        worksheet.getCell('A1').value = 'SENA';
        worksheet.getCell('A1').font = { bold: true, size: 16, name: 'Arial', color: { argb: 'FF39A900' } };
        worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getCell('A1').border = thickBorder;
        ['A2', 'A3', 'A4'].forEach(cell => worksheet.getCell(cell).border = thickBorder);

        worksheet.mergeCells('B1:D2');
        worksheet.getCell('B1').value = 'PROCESO DE GESTIÓN DE INFRAESTRUCTURA Y LOGÍSTICA\nFORMATO PARA CHEQUEO DE VEHÍCULOS';
        worksheet.getCell('B1').font = bigTitleFont;
        worksheet.getCell('B1').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        worksheet.getCell('B1').border = thickBorder;
        ['C1', 'D1', 'B2', 'C2', 'D2'].forEach(cell => worksheet.getCell(cell).border = thickBorder);

        worksheet.getCell('D3').value = 'Versión: 04';
        worksheet.getCell('D3').font = headerFont;
        worksheet.getCell('D3').alignment = { horizontal: 'right' };
        worksheet.getCell('D3').border = fullBorder;

        worksheet.getCell('D4').value = 'Código: GIL-F-041';
        worksheet.getCell('D4').font = headerFont;
        worksheet.getCell('D4').alignment = { horizontal: 'right' };
        worksheet.getCell('D4').border = fullBorder;

        ['B3', 'C3', 'B4', 'C4'].forEach(cell => worksheet.getCell(cell).border = fullBorder);

        // 2. DATOS GENERALES
        worksheet.getRow(5).height = 10;
        ['A5', 'B5', 'C5', 'D5'].forEach(cell => worksheet.getCell(cell).border = fullBorder);

        const dataStartRow = 6;
        const generalData = [
            { label: 'NOMBRE REGIONAL:', value: 'VALLE', label2: 'FECHA:', value2: new Date(checklist.checklistDate).toLocaleDateString('es-CO') },
            { label: 'NOMBRE CENTRO DE FORMACIÓN:', value: 'CENTRO DE GESTIÓN TECNOLÓGICA DE SERVICIOS', label2: '', value2: '' },
            { label: 'TIPO DE VEHICULO:', value: `${checklist.vehicle?.brand || ''} ${checklist.vehicle?.model || ''}`.trim(), label2: 'PLACAS:', value2: checklist.vehicle?.plate || '' },
            { label: '', value: '', label2: 'CONDUCTOR:', value2: checklist.driverName || checklist.driver?.fullName || '' },
        ];

        generalData.forEach((row, index) => {
            const r = dataStartRow + index;
            worksheet.getCell(`A${r}`).value = row.label;
            worksheet.getCell(`B${r}`).value = row.value;
            worksheet.getCell(`C${r}`).value = row.label2;
            worksheet.getCell(`D${r}`).value = row.value2;

            ['A', 'B', 'C', 'D'].forEach(col => {
                const cell = worksheet.getCell(`${col}${r}`);
                cell.border = fullBorder;
                cell.alignment = leftAlign;
                if (col === 'A' || col === 'C') {
                    cell.font = { bold: true, size: 10, name: 'Arial' };
                } else {
                    cell.font = { size: 10, name: 'Arial' };
                }
            });
        });

        const emptyRow = dataStartRow + generalData.length;
        worksheet.getRow(emptyRow).height = 10;
        ['A' + emptyRow, 'B' + emptyRow, 'C' + emptyRow, 'D' + emptyRow].forEach(cell => worksheet.getCell(cell).border = fullBorder);

        // 3. TABLA DE INSPECCIÓN
        const headerRow = emptyRow + 1;
        worksheet.mergeCells(`A${headerRow}:D${headerRow}`);
        worksheet.getCell(`A${headerRow}`).value = 'ELEMENTOS A INSPECCIONAR';
        worksheet.getCell(`A${headerRow}`).font = { bold: true, size: 11, name: 'Arial' };
        worksheet.getCell(`A${headerRow}`).alignment = centerAlign;
        worksheet.getCell(`A${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        worksheet.getCell(`A${headerRow}`).border = thickBorder;
        ['B' + headerRow, 'C' + headerRow, 'D' + headerRow].forEach(cell => worksheet.getCell(cell).border = thickBorder);

        const subHeaderRow = headerRow + 1;
        const subHeaders = ['ELEMENTOS A INSPECCIONAR', 'SI', 'NO', 'OBSERVACIONES'];
        subHeaders.forEach((h, i) => {
            const col = ['A', 'B', 'C', 'D'][i];
            const cell = worksheet.getCell(`${col}${subHeaderRow}`);
            cell.value = h;
            cell.font = headerFont;
            cell.alignment = centerAlign;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
            cell.border = fullBorder;
        });

        let currentRow = subHeaderRow + 1;
        checklist.items.forEach((item: any) => {
            worksheet.getCell(`A${currentRow}`).value = item.itemName;
            worksheet.getCell(`B${currentRow}`).value = item.status === 'SI' ? 'X' : '';
            worksheet.getCell(`C${currentRow}`).value = item.status === 'NO' ? 'X' : '';
            worksheet.getCell(`D${currentRow}`).value = item.observation || '';

            ['A', 'B', 'C', 'D'].forEach(col => {
                const cell = worksheet.getCell(`${col}${currentRow}`);
                cell.border = fullBorder;
                cell.alignment = col === 'A' || col === 'D' ? leftAlign : centerAlign;
                cell.font = { size: 10, name: 'Arial' };
            });

            if (item.status === 'NO') {
                worksheet.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
                worksheet.getCell(`C${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
            }
            currentRow++;
        });

        // 4. SECCIÓN DE FIRMAS CON IMAGEN LIMPIA
        const emptyRowBeforeSignatures = currentRow;
        worksheet.getRow(emptyRowBeforeSignatures).height = 10;
        ['A' + emptyRowBeforeSignatures, 'B' + emptyRowBeforeSignatures, 'C' + emptyRowBeforeSignatures, 'D' + emptyRowBeforeSignatures].forEach(cell => worksheet.getCell(cell).border = fullBorder);

        const signatureRow = emptyRowBeforeSignatures + 1;

        worksheet.mergeCells(`A${signatureRow}:D${signatureRow}`);
        worksheet.getCell(`A${signatureRow}`).value = `NOMBRE CONDUCTOR: ${checklist.driverName || checklist.driver?.fullName || ''}     FIRMA:`;
        worksheet.getCell(`A${signatureRow}`).font = { bold: true, size: 10, name: 'Arial' };
        worksheet.getCell(`A${signatureRow}`).alignment = leftAlign;
        worksheet.getCell(`A${signatureRow}`).border = fullBorder;
        ['B' + signatureRow, 'C' + signatureRow, 'D' + signatureRow].forEach(cell => worksheet.getCell(cell).border = fullBorder);

        // ✅ INSERTAR IMAGEN DE LA FIRMA DEL CONDUCTOR (A PRUEBA DE FALLAS)
        if (checklist.signature) {
            try {
                let base64Data = checklist.signature;

                // 1. Eliminar el prefijo data:image/...;base64,
                if (base64Data.includes('base64,')) {
                    base64Data = base64Data.split('base64,')[1];
                }

                // 2. ELIMINAR TODOS los espacios en blanco, saltos de línea o caracteres invisibles
                base64Data = base64Data.replace(/\s+/g, '');

                // 3. Validar y corregir el padding (el base64 válido debe tener longitud múltiplo de 4)
                while (base64Data.length % 4 !== 0) {
                    base64Data += '=';
                }

                // 4. Detectar la extensión correcta (exceljs solo acepta 'png', 'jpeg' o 'gif')
                let extension: 'png' | 'jpeg' | 'gif' = 'png';
                if (checklist.signature.includes('image/jpeg') || checklist.signature.includes('image/jpg')) {
                    extension = 'jpeg';
                }

                console.log('🖼️ Insertando firma, longitud base64 limpia:', base64Data.length, 'Extensión:', extension);

                const imageId = workbook.addImage({
                    base64: base64Data,
                    extension: extension,
                });

                // Insertar la imagen en la posición correcta
                worksheet.addImage(imageId, {
                    tl: { col: 2.5, row: signatureRow - 1 + 0.3 },
                    ext: { width: 150, height: 60 },
                });

                console.log('✅ Firma insertada correctamente en el Excel');
            } catch (error) {
                console.error('❌ Error al insertar la firma en el Excel:', error);
                console.error('📝 Signature data (primeros 100 chars):', checklist.signature?.substring(0, 100));
            }
        }
        worksheet.getRow(signatureRow).height = 80;

        const reviewerRow = signatureRow + 1;
        worksheet.mergeCells(`A${reviewerRow}:D${reviewerRow}`);
        worksheet.getCell(`A${reviewerRow}`).value = 'NOMBRE, CARGO Y FIRMA DE QUIEN REVISÓ:';
        worksheet.getCell(`A${reviewerRow}`).font = { bold: true, size: 10, name: 'Arial' };
        worksheet.getCell(`A${reviewerRow}`).alignment = leftAlign;
        worksheet.getCell(`A${reviewerRow}`).border = fullBorder;
        ['B' + reviewerRow, 'C' + reviewerRow, 'D' + reviewerRow].forEach(cell => worksheet.getCell(cell).border = fullBorder);

        worksheet.getRow(reviewerRow).height = 60;

        const extraRow = reviewerRow + 1;
        worksheet.mergeCells(`A${extraRow}:D${extraRow}`);
        worksheet.getCell(`A${extraRow}`).border = fullBorder;
        ['B' + extraRow, 'C' + extraRow, 'D' + extraRow].forEach(cell => worksheet.getCell(cell).border = fullBorder);
        worksheet.getRow(extraRow).height = 40;

        // 5. CONFIGURACIÓN DE IMPRESIÓN
        worksheet.pageSetup = {
            orientation: 'portrait',
            paperSize: 9,
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 1,
            margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
        };

        const buffer = await workbook.xlsx.writeBuffer();
        const filename = `GIL-F-041_${checklist.vehicle?.plate || 'SIN_PLACA'}_${new Date().toISOString().split('T')[0]}.xlsx`;

        return { buffer, filename };
    }
}