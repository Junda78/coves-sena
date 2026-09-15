import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { FuelType } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';

interface FuelLogData {
    station: string;
    ticketNumber: string | null;
    fuelDate: Date;
    fuelTime: string | null;
    vehicleId: number;
    km: number | null;
    product: FuelType;
    gallons: number;
    unitPrice: number;
    totalValue: number;
    driverName: string | null;
    dependency: string | null;
    observations: string | null;
    uniqueKey: string;
}

@Injectable()
export class FuelService {
    constructor(private prisma: PrismaService) { }

    // ==================== GENERAR UNIQUE KEY ====================
    private generateUniqueKey(plate: string, date: Date, totalValue: number, gallons: number): string {
        const dateStr = date.toISOString().split('T')[0];
        const valueRounded = Math.round(totalValue * 100) / 100;
        const gallonsRounded = Math.round(gallons * 10000) / 10000;
        const raw = `${plate}-${dateStr}-${valueRounded}-${gallonsRounded}`;
        return crypto.createHash('md5').update(raw).digest('hex').substring(0, 32);
    }

    // ==================== PARSEAR MONEDA ====================
    private parseCurrency(value: any): number {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const cleaned = value
                .replace(/\$/g, '')
                .replace(/\s/g, '')
                .replace(/\./g, '')
                .replace(/,/g, '.');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    }

    // ==================== UPLOAD EXCEL ====================
    async uploadExcel(file: Express.Multer.File) {
        if (!file || !file.buffer) {
            throw new BadRequestException('No se recibió ningún archivo válido');
        }

        console.log(`\n📊 ========== INICIO DE PROCESAMIENTO ==========`);
        console.log(`📁 Archivo: ${file.originalname}`);

        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        console.log(` Hojas encontradas: ${workbook.SheetNames.join(', ')}`);

        let totalNewRecords = 0;
        let totalDuplicates = 0;
        let totalErrors = 0;
        const allLogsToSave: FuelLogData[] = [];
        const processedKeys = new Set<string>();

        for (const sheetName of workbook.SheetNames) {
            if (sheetName.toLowerCase().includes('total') ||
                sheetName.toLowerCase().includes('diesel') ||
                sheetName.toLowerCase().includes('combustible')) {
                console.log(`⏭️  Saltando hoja de resumen: ${sheetName}`);
                continue;
            }

            console.log(`\n🔄 Procesando hoja: ${sheetName}`);

            const sheet = workbook.Sheets[sheetName];
            const data: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

            if (data.length === 0) continue;

            let headerRowIndex = -1;
            let headers: string[] = [];

            for (let i = 0; i < Math.min(data.length, 15); i++) {
                const row = data[i] as string[];
                if (row && row.some(cell => String(cell).toLowerCase().includes('placa')) &&
                    row.some(cell => String(cell).toLowerCase().includes('volumen'))) {
                    headerRowIndex = i;
                    headers = row.map((h: any) => String(h || '').trim().toLowerCase());
                    break;
                }
            }

            if (headerRowIndex === -1) continue;

            const colIndex = {
                placa: headers.findIndex(h => h.includes('placa')),
                fecha: headers.findIndex(h => h.includes('fecha')),
                volumen: headers.findIndex(h => h.includes('volumen')),
                valorTotal: headers.findIndex(h => h.includes('valor total')),
                producto: headers.findIndex(h => h.includes('producto')),
                km: headers.findIndex(h => h.includes('km') && !h.includes('gps')),
                empleado: headers.findIndex(h => h.includes('empleado')),
                estacion: headers.findIndex(h => h.includes('estación') || h.includes('estacion')),
            };

            for (let i = headerRowIndex + 1; i < data.length; i++) {
                const row = data[i] as any[];
                if (!row || row.length === 0) continue;

                const placa = String(row[colIndex.placa] || '').trim().toUpperCase();
                const fechaRaw = row[colIndex.fecha];
                const volumenRaw = row[colIndex.volumen];
                const valorTotalRaw = row[colIndex.valorTotal];
                const productoRaw = String(row[colIndex.producto] || '').trim().toUpperCase();
                const kmRaw = row[colIndex.km];
                const empleadoRaw = String(row[colIndex.empleado] || '').trim();
                const estacionRaw = String(row[colIndex.estacion] || '').trim();

                if (!placa || !fechaRaw || String(placa).includes('TOTAL') || placa === '0') continue;

                try {
                    let fuelDate: Date;
                    if (typeof fechaRaw === 'number') {
                        fuelDate = new Date(Math.round((fechaRaw - 25569) * 86400 * 1000));
                    } else if (typeof fechaRaw === 'string') {
                        const parts = fechaRaw.split(' ');
                        const dateParts = parts[0].split('/');
                        if (dateParts.length === 3) {
                            const day = parseInt(dateParts[0], 10);
                            const month = parseInt(dateParts[1], 10) - 1;
                            const year = parseInt(dateParts[2], 10);
                            fuelDate = new Date(year, month, day);
                        } else {
                            fuelDate = new Date(fechaRaw);
                        }
                    } else {
                        totalErrors++;
                        continue;
                    }

                    const gallons = typeof volumenRaw === 'string'
                        ? parseFloat(volumenRaw.replace(',', '.'))
                        : Number(volumenRaw) || 0;

                    const totalValue = this.parseCurrency(valorTotalRaw);
                    const km = kmRaw ? parseInt(String(kmRaw).replace(/\s/g, ''), 10) : null;

                    let product: FuelType = FuelType.ACPM;
                    if (productoRaw.includes('CORRIENTE')) product = FuelType.CORRIENTE;
                    else if (productoRaw.includes('DIESEL') || productoRaw.includes('ACPM')) product = FuelType.ACPM;
                    else if (productoRaw.includes('GAS')) product = FuelType.GAS;
                    else if (productoRaw.includes('EXTRA')) product = FuelType.EXTRA;

                    const vehicle = await this.prisma.vehicle.findUnique({ where: { plate: placa } });
                    if (!vehicle) {
                        console.warn(`️  Vehículo no encontrado: ${placa}`);
                        totalErrors++;
                        continue;
                    }

                    const uniqueKey = this.generateUniqueKey(placa, fuelDate, totalValue, gallons);

                    const existingLog = await this.prisma.fuelLog.findUnique({
                        where: { uniqueKey },
                    });

                    if (existingLog) {
                        console.log(`⏭️  Duplicado en BD: ${placa} - ${fuelDate.toISOString().split('T')[0]} - $${totalValue}`);
                        totalDuplicates++;
                        continue;
                    }

                    if (processedKeys.has(uniqueKey)) {
                        console.log(`⏭️  Duplicado en archivo: ${placa} - ${fuelDate.toISOString().split('T')[0]}`);
                        totalDuplicates++;
                        continue;
                    }

                    processedKeys.add(uniqueKey);

                    allLogsToSave.push({
                        station: estacionRaw || 'SALOMIA',
                        ticketNumber: null,
                        fuelDate,
                        fuelTime: typeof fechaRaw === 'string' ? fechaRaw.split(' ')[1] : null,
                        vehicleId: vehicle.id,
                        km,
                        product,
                        gallons,
                        unitPrice: gallons > 0 ? totalValue / gallons : 0,
                        totalValue,
                        driverName: empleadoRaw || null,
                        dependency: 'CGTS',
                        observations: `Importado desde ${file.originalname}`,
                        uniqueKey,
                    });

                    totalNewRecords++;
                    console.log(`✅ Registro ${totalNewRecords}: ${placa} - ${gallons} gal - $${totalValue} (${fuelDate.toISOString().split('T')[0]})`);

                } catch (error) {
                    console.error(`❌ Error procesando fila ${i}:`, error);
                    totalErrors++;
                }
            }
        }

        if (allLogsToSave.length === 0) {
            console.log(`\n❌ ========== NO HAY DATOS NUEVOS ==========`);
            console.log(`❌ Duplicados detectados: ${totalDuplicates}`);
            throw new BadRequestException(
                `❌ No hay datos nuevos para importar. Todos los ${totalDuplicates} registros ya existen en la base de datos.`
            );
        }

        const logsByMonth: { [key: string]: FuelLogData[] } = {};
        allLogsToSave.forEach(log => {
            const month = log.fuelDate.getMonth() + 1;
            const year = log.fuelDate.getFullYear();
            const key = `${year}-${month}`;
            if (!logsByMonth[key]) logsByMonth[key] = [];
            logsByMonth[key].push(log);
        });

        console.log(`\n💾 Creando uploads por mes/año...`);
        const uploadsCreated: string[] = [];

        for (const [key, logs] of Object.entries(logsByMonth)) {
            const [yearStr, monthStr] = key.split('-');
            const year = parseInt(yearStr);
            const month = parseInt(monthStr);

            const upload = await this.prisma.fuelUpload.create({
                data: {
                    originalFilename: file.originalname,
                    month,
                    year,
                    totalGallons: logs.reduce((sum, log) => sum + log.gallons, 0),
                    totalValue: logs.reduce((sum, log) => sum + log.totalValue, 0),
                    recordsCount: logs.length,
                },
            });

            await this.prisma.fuelLog.createMany({
                data: logs.map(log => ({ ...log, uploadId: upload.id })),
            });

            uploadsCreated.push(`${this.getMonthName(month)} ${year}`);
            console.log(`💾 Upload creado: ${this.getMonthName(month)} ${year} - ${logs.length} registros`);
        }

        console.log(`\n✅ ========== PROCESAMIENTO COMPLETADO ==========`);
        console.log(`✅ Nuevos: ${totalNewRecords}`);
        console.log(`✅ Duplicados omitidos: ${totalDuplicates}`);
        console.log(`✅ Errores: ${totalErrors}`);
        console.log(`✅ Uploads creados: ${uploadsCreated.join(', ')}`);

        return {
            newRecords: totalNewRecords,
            duplicatesSkipped: totalDuplicates,
            errorsSkipped: totalErrors,
            uploadsCreated: uploadsCreated.length,
            message: `✅ ${totalNewRecords} registros nuevos agregados, ${totalDuplicates} duplicados omitidos. ${uploadsCreated.length} uploads creados (${uploadsCreated.join(', ')}).`,
        };
    }

    // ==================== EXPORTAR REPORTE GIL-F-066 ====================
    async exportMonthlyReport(month: number, year: number) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        const logs = await this.prisma.fuelLog.findMany({
            where: { fuelDate: { gte: startDate, lte: endDate } },
            include: { vehicle: true },
            orderBy: { fuelDate: 'asc' },
        });

        if (logs.length === 0) {
            throw new NotFoundException(`No se encontraron registros para ${month}/${year}`);
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('GIL-F-066', {
            properties: { defaultColWidth: 18 },
        });

        // ==================== 1. LOGO SENA ====================
        const logoPath = path.join(process.cwd(), 'src', 'assets', 'sena-logo.png');
        if (fs.existsSync(logoPath)) {
            const imageBuffer = fs.readFileSync(logoPath);
            const imageId = workbook.addImage({
                buffer: imageBuffer as any,
                extension: 'png',
            });
            worksheet.addImage(imageId, {
                tl: { col: 4.5, row: 0.5 },
                ext: { width: 90, height: 90 },
            });
        }

        // ==================== 2. CAJA VERSIÓN/CÓDIGO ====================
        const versionCell = worksheet.getCell('N2');
        versionCell.value = 'Versión: 03';
        versionCell.font = { size: 10, name: 'Arial' };
        versionCell.alignment = { horizontal: 'center', vertical: 'middle' };
        versionCell.border = {
            top: { style: 'thin', color: { argb: 'FF808080' } },
            left: { style: 'thin', color: { argb: 'FF808080' } },
            bottom: { style: 'thin', color: { argb: 'FF808080' } },
            right: { style: 'thin', color: { argb: 'FF808080' } },
        };

        const codeCell = worksheet.getCell('N3');
        codeCell.value = 'Código:\nGIL-F-066';
        codeCell.font = { size: 10, name: 'Arial' };
        codeCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        codeCell.border = {
            top: { style: 'thin', color: { argb: 'FF808080' } },
            left: { style: 'thin', color: { argb: 'FF808080' } },
            bottom: { style: 'thin', color: { argb: 'FF808080' } },
            right: { style: 'thin', color: { argb: 'FF808080' } },
        };

        // ==================== 3. BARRA GRIS: PROCESO ====================
        worksheet.mergeCells('A5:N5');
        const procesoCell = worksheet.getCell('A5');
        procesoCell.value = 'PROCESO GESTIÓN DE INFRAESTRUCTURA Y LOGÍSTICA';
        procesoCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' }, name: 'Arial' };
        procesoCell.alignment = { horizontal: 'center', vertical: 'middle' };
        procesoCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF404040' },
        };
        procesoCell.border = {
            top: { style: 'thin', color: { argb: 'FF808080' } },
            left: { style: 'thin', color: { argb: 'FF808080' } },
            bottom: { style: 'thin', color: { argb: 'FF808080' } },
            right: { style: 'thin', color: { argb: 'FF808080' } },
        };
        worksheet.getRow(5).height = 35;

        // ==================== 4. BARRA GRIS: FORMATO ====================
        worksheet.mergeCells('A6:N6');
        const formatoCell = worksheet.getCell('A6');
        formatoCell.value = 'FORMATO CONTROL COMBUSTIBLE CON CHIP MAESTRO';
        formatoCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' }, name: 'Arial' };
        formatoCell.alignment = { horizontal: 'center', vertical: 'middle' };
        formatoCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF404040' },
        };
        formatoCell.border = {
            top: { style: 'thin', color: { argb: 'FF808080' } },
            left: { style: 'thin', color: { argb: 'FF808080' } },
            bottom: { style: 'thin', color: { argb: 'FF808080' } },
            right: { style: 'thin', color: { argb: 'FF808080' } },
        };
        worksheet.getRow(6).height = 35;

        // ==================== 5. METADATOS ====================
        worksheet.getCell('A7').value = 'Nombre de la Regional';
        worksheet.getCell('A7').font = { bold: true, size: 11, name: 'Arial' };
        worksheet.mergeCells('B7:M7');
        worksheet.getCell('B7').value = 'REGIONAL VALLE';
        worksheet.getCell('B7').font = { size: 11, name: 'Arial' };
        worksheet.getCell('B7').border = { bottom: { style: 'thin', color: { argb: 'FF808080' } } };

        worksheet.getCell('N7').value = 'Mes:';
        worksheet.getCell('N7').font = { bold: true, size: 11, name: 'Arial' };
        worksheet.getCell('N7').alignment = { horizontal: 'right' };
        worksheet.getCell('O7').value = this.getMonthName(month);
        worksheet.getCell('O7').font = { size: 11, name: 'Arial' };

        worksheet.getCell('A8').value = 'Centro de Formación:';
        worksheet.getCell('A8').font = { bold: true, size: 11, name: 'Arial' };
        worksheet.mergeCells('B8:M8');
        worksheet.getCell('B8').value = 'CENTRO DE GESTIÓN TECNOLÓGICA DE SERVICIOS';
        worksheet.getCell('B8').font = { size: 11, name: 'Arial' };
        worksheet.getCell('B8').border = { bottom: { style: 'thin', color: { argb: 'FF808080' } } };

        worksheet.getCell('N8').value = 'Año:';
        worksheet.getCell('N8').font = { bold: true, size: 11, name: 'Arial' };
        worksheet.getCell('N8').alignment = { horizontal: 'right' };
        worksheet.getCell('O8').value = year;
        worksheet.getCell('O8').font = { size: 11, name: 'Arial' };

        // ==================== 6. ENCABEZADOS DE TABLA ====================
        const headers = [
            'Estación de\nServicio',
            'Tiquete No.',
            'Fecha\nAbastecimiento',
            'Hora\nAbastecimiento',
            'Placa\nVehículo',
            'Kilometraje',
            'Gasolina\ncorriente',
            'Gasolina\nextra',
            'Diésel',
            'Gas\nvehicular',
            'Cantidad de\nGalones\nCargados',
            'Total Venta',
            'Nombre\nConductor',
            'Dependencia',
            'Observaciones',
        ];

        const headerRow = worksheet.getRow(9);
        headerRow.height = 55;

        headers.forEach((header, index) => {
            const cell = headerRow.getCell(index + 1);
            cell.value = header;
            cell.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF000000' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD9D9D9' },
            };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF808080' } },
                left: { style: 'thin', color: { argb: 'FF808080' } },
                bottom: { style: 'thin', color: { argb: 'FF808080' } },
                right: { style: 'thin', color: { argb: 'FF808080' } },
            };
        });

        // ==================== 7. ANCHOS DE COLUMNA ====================
        const colWidths = [20, 15, 18, 16, 16, 16, 16, 14, 14, 14, 18, 18, 30, 18, 25];
        colWidths.forEach((width, index) => {
            worksheet.getColumn(index + 1).width = width;
        });

        // ==================== 8. DATOS ====================
        let totalGallons = 0;
        let totalValue = 0;
        const dataStartRow = 10;

        logs.forEach((log, index) => {
            const rowNumber = dataStartRow + index;
            const row = worksheet.getRow(rowNumber);
            row.height = 30;

            const dateStr = log.fuelDate.toLocaleDateString('es-CO');
            const corriente = log.product === 'CORRIENTE' ? 'X' : '';
            const extra = log.product === 'EXTRA' ? 'X' : '';
            const diesel = log.product === 'ACPM' ? 'X' : '';
            const gas = log.product === 'GAS' ? 'X' : '';

            const gallonsNum = Number(log.gallons);
            const valueNum = Number(log.totalValue);
            totalGallons += gallonsNum;
            totalValue += valueNum;

            const rowData = [
                log.station || 'SALOMIA',
                log.ticketNumber || '',
                dateStr,
                log.fuelTime || '',
                log.vehicle?.plate || 'N/A',
                log.km || 0,
                corriente,
                extra,
                diesel,
                gas,
                gallonsNum.toFixed(2),
                valueNum,
                log.driverName || '',
                log.dependency || 'CGTS',
                log.observations || '',
            ];

            rowData.forEach((value, colIndex) => {
                const cell = row.getCell(colIndex + 1);
                cell.value = value;
                cell.font = { size: 11, name: 'Arial' };
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FF808080' } },
                    left: { style: 'thin', color: { argb: 'FF808080' } },
                    bottom: { style: 'thin', color: { argb: 'FF808080' } },
                    right: { style: 'thin', color: { argb: 'FF808080' } },
                };

                if (colIndex === 11) {
                    cell.numFmt = '$#,##0.00';
                    cell.alignment = { horizontal: 'right', vertical: 'middle' };
                }

                if ([0, 12, 13, 14].includes(colIndex)) {
                    cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
                }
            });
        });

        // ==================== 9. FILAS VACÍAS ====================
        const emptyRows = 10;
        for (let i = 0; i < emptyRows; i++) {
            const rowNumber = dataStartRow + logs.length + i;
            const row = worksheet.getRow(rowNumber);
            row.height = 30;
            for (let col = 1; col <= 15; col++) {
                const cell = row.getCell(col);
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FF808080' } },
                    left: { style: 'thin', color: { argb: 'FF808080' } },
                    bottom: { style: 'thin', color: { argb: 'FF808080' } },
                    right: { style: 'thin', color: { argb: 'FF808080' } },
                };
            }
        }

        // ==================== 10. FILA DE TOTALES ====================
        const totalRowNumber = dataStartRow + logs.length + emptyRows;
        const totalRow = worksheet.getRow(totalRowNumber);
        totalRow.height = 35;

        worksheet.mergeCells(`A${totalRowNumber}:K${totalRowNumber}`);
        const totalLabelCell = worksheet.getCell(`A${totalRowNumber}`);
        totalLabelCell.value = 'TOTAL FACTURADO CON CHIP MAESTRO';
        totalLabelCell.font = { bold: true, size: 12, name: 'Arial' };
        totalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };
        totalLabelCell.border = {
            top: { style: 'thin', color: { argb: 'FF808080' } },
            left: { style: 'thin', color: { argb: 'FF808080' } },
            bottom: { style: 'thin', color: { argb: 'FF808080' } },
            right: { style: 'thin', color: { argb: 'FF808080' } },
        };

        const totalGallonsCell = worksheet.getCell(`L${totalRowNumber}`);
        totalGallonsCell.value = totalGallons.toFixed(2);
        totalGallonsCell.font = { bold: true, size: 12, name: 'Arial' };
        totalGallonsCell.alignment = { horizontal: 'center', vertical: 'middle' };
        totalGallonsCell.border = {
            top: { style: 'thin', color: { argb: 'FF808080' } },
            left: { style: 'thin', color: { argb: 'FF808080' } },
            bottom: { style: 'thin', color: { argb: 'FF808080' } },
            right: { style: 'thin', color: { argb: 'FF808080' } },
        };

        const totalValueCell = worksheet.getCell(`M${totalRowNumber}`);
        totalValueCell.value = totalValue;
        totalValueCell.font = { bold: true, size: 12, name: 'Arial' };
        totalValueCell.alignment = { horizontal: 'right', vertical: 'middle' };
        totalValueCell.numFmt = '$#,##0.00';
        totalValueCell.border = {
            top: { style: 'thin', color: { argb: 'FF808080' } },
            left: { style: 'thin', color: { argb: 'FF808080' } },
            bottom: { style: 'thin', color: { argb: 'FF808080' } },
            right: { style: 'thin', color: { argb: 'FF808080' } },
        };

        for (let col = 14; col <= 15; col++) {
            const cell = worksheet.getRow(totalRowNumber).getCell(col);
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF808080' } },
                left: { style: 'thin', color: { argb: 'FF808080' } },
                bottom: { style: 'thin', color: { argb: 'FF808080' } },
                right: { style: 'thin', color: { argb: 'FF808080' } },
            };
        }

        // ==================== 11. SECCIÓN DE FIRMAS ====================
        const signatureStartRow = totalRowNumber + 2;

        worksheet.mergeCells(`A${signatureStartRow}:K${signatureStartRow}`);
        const elaboroLabel = worksheet.getCell(`A${signatureStartRow}`);
        elaboroLabel.value = 'ELABORÓ:';
        elaboroLabel.font = { bold: true, size: 12, name: 'Arial' };
        elaboroLabel.alignment = { vertical: 'middle' };
        elaboroLabel.border = {
            top: { style: 'thin', color: { argb: 'FF808080' } },
            left: { style: 'thin', color: { argb: 'FF808080' } },
            bottom: { style: 'thin', color: { argb: 'FF808080' } },
            right: { style: 'thin', color: { argb: 'FF808080' } },
        };

        worksheet.mergeCells(`L${signatureStartRow}:O${signatureStartRow}`);
        const aproboLabel = worksheet.getCell(`L${signatureStartRow}`);
        aproboLabel.value = 'APROBÓ:';
        aproboLabel.font = { bold: true, size: 12, name: 'Arial' };
        aproboLabel.alignment = { vertical: 'middle' };
        aproboLabel.border = {
            top: { style: 'thin', color: { argb: 'FF808080' } },
            left: { style: 'thin', color: { argb: 'FF808080' } },
            bottom: { style: 'thin', color: { argb: 'FF808080' } },
            right: { style: 'thin', color: { argb: 'FF808080' } },
        };

        worksheet.mergeCells(`A${signatureStartRow + 1}:K${signatureStartRow + 1}`);
        const cargoLabel = worksheet.getCell(`A${signatureStartRow + 1}`);
        cargoLabel.value = 'CARGO:';
        cargoLabel.font = { bold: true, size: 12, name: 'Arial' };
        cargoLabel.alignment = { vertical: 'middle' };
        cargoLabel.border = {
            top: { style: 'thin', color: { argb: 'FF808080' } },
            left: { style: 'thin', color: { argb: 'FF808080' } },
            bottom: { style: 'thin', color: { argb: 'FF808080' } },
            right: { style: 'thin', color: { argb: 'FF808080' } },
        };

        worksheet.mergeCells(`L${signatureStartRow + 1}:O${signatureStartRow + 1}`);
        const cargoLabel2 = worksheet.getCell(`L${signatureStartRow + 1}`);
        cargoLabel2.value = 'CARGO:';
        cargoLabel2.font = { bold: true, size: 12, name: 'Arial' };
        cargoLabel2.alignment = { vertical: 'middle' };
        cargoLabel2.border = {
            top: { style: 'thin', color: { argb: 'FF808080' } },
            left: { style: 'thin', color: { argb: 'FF808080' } },
            bottom: { style: 'thin', color: { argb: 'FF808080' } },
            right: { style: 'thin', color: { argb: 'FF808080' } },
        };

        worksheet.getRow(signatureStartRow).height = 40;
        worksheet.getRow(signatureStartRow + 1).height = 40;

        // ==================== 12. BORDE EXTERIOR GRIS ====================
        const lastRow = signatureStartRow + 1;
        for (let row = 1; row <= lastRow; row++) {
            for (let col = 1; col <= 15; col++) {
                const cell = worksheet.getRow(row).getCell(col);
                if (row === 1 || row === lastRow || col === 1 || col === 15) {
                    cell.border = {
                        top: { style: 'medium', color: { argb: 'FF808080' } },
                        left: { style: 'medium', color: { argb: 'FF808080' } },
                        bottom: { style: 'medium', color: { argb: 'FF808080' } },
                        right: { style: 'medium', color: { argb: 'FF808080' } },
                    };
                }
            }
        }

        // ==================== 13. CONFIGURACIÓN DE IMPRESIÓN ====================
        worksheet.pageSetup = {
            orientation: 'landscape',
            paperSize: 9,
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
        };

        // ==================== 14. GENERAR BUFFER ====================
        const buffer = await workbook.xlsx.writeBuffer();
        const filename = `GIL-F-066_Control_Combustible_${this.getMonthName(month)}_${year}.xlsx`;

        return { buffer, filename };
    }

    private getMonthName(month: number): string {
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return months[month - 1];
    }

    // ==================== MÉTODOS AUXILIARES (CORREGIDOS PARA GARANTIZAR NÚMEROS) ====================

    async findAll() {
        const uploads = await this.prisma.fuelUpload.findMany({
            orderBy: { processedAt: 'desc' }
        });

        // ✅ MAPEO EXPLÍCITO: Garantiza camelCase y tipo Number
        return uploads.map(upload => ({
            id: upload.id,
            originalFilename: upload.originalFilename,
            month: upload.month,
            year: upload.year,
            totalGallons: Number(upload.totalGallons || 0),
            totalValue: Number(upload.totalValue || 0),
            recordsCount: upload.recordsCount,
            processedAt: upload.processedAt,
        }));
    }

    async getLogsByUpload(uploadId: number) {
        const logs = await this.prisma.fuelLog.findMany({
            where: { uploadId },
            include: { vehicle: true }
        });

        // ✅ MAPEO EXPLÍCITO: Garantiza que gallons y totalValue sean números
        return logs.map(log => ({
            ...log,
            gallons: Number(log.gallons || 0),
            totalValue: Number(log.totalValue || 0),
            km: log.km ? Number(log.km) : null,
        }));
    }

    async removeUpload(uploadId: number) {
        await this.prisma.fuelLog.deleteMany({ where: { uploadId } });
        await this.prisma.fuelUpload.delete({ where: { id: uploadId } });
        return { message: 'Upload eliminado' };
    }

    async getLogsByVehicle(vehicleId: number) {
        return this.prisma.fuelLog.findMany({
            where: { vehicleId },
            include: { vehicle: true }
        });
    }

    async getLogsByDateRange(startDate: string, endDate: string) {
        return this.prisma.fuelLog.findMany({
            where: { fuelDate: { gte: new Date(startDate), lte: new Date(endDate) } },
            include: { vehicle: true },
        });
    }

    async getSummaryByMonth(month: number, year: number) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);
        const logs = await this.prisma.fuelLog.findMany({
            where: { fuelDate: { gte: startDate, lte: endDate } },
            include: { vehicle: true },
        });

        const totalGallons = logs.reduce((sum, log) => sum + Number(log.gallons || 0), 0);
        const totalValue = logs.reduce((sum, log) => sum + Number(log.totalValue || 0), 0);

        return {
            month,
            year,
            totalRecords: logs.length,
            totalGallons,
            totalValue,
            averagePricePerGallon: totalGallons > 0 ? totalValue / totalGallons : 0
        };
    }
}