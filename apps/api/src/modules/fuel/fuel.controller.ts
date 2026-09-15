import {
    Controller,
    Get,
    Post,
    Delete,
    Query,
    Param,
    UseInterceptors,
    UploadedFile,
    Res,
    NotFoundException,
    BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FuelService } from './fuel.service';
import type { Response } from 'express';

@Controller('fuel')
export class FuelController {
    constructor(private readonly fuelService: FuelService) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadExcel(
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('No se proporcionó ningún archivo');
        }

        return this.fuelService.uploadExcel(file);
    }

    @Get('uploads')
    async findAll() {
        return this.fuelService.findAll();
    }

    @Get('uploads/:uploadId/logs')
    async getLogsByUpload(@Param('uploadId') uploadId: string) {
        return this.fuelService.getLogsByUpload(parseInt(uploadId, 10));
    }

    @Delete('uploads/:uploadId')
    async removeUpload(@Param('uploadId') uploadId: string) {
        return this.fuelService.removeUpload(parseInt(uploadId, 10));
    }

    @Get('export')
    async exportReport(
        @Query('month') month: string,
        @Query('year') year: string,
        @Res() res: Response
    ) {
        try {
            if (!month || !year) {
                throw new BadRequestException('Se requiere especificar el mes y el año');
            }

            const { buffer, filename } = await this.fuelService.exportMonthlyReport(
                parseInt(month, 10),
                parseInt(year, 10)
            );

            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="${filename}"`
            );

            res.send(buffer);
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                res.status(404).json({ message: error.message });
            } else {
                console.error('Error al exportar reporte:', error);
                res.status(500).json({ message: 'Error interno al generar el reporte' });
            }
        }
    }

    @Get('summary')
    async getSummary(
        @Query('month') month: string,
        @Query('year') year: string,
    ) {
        if (!month || !year) {
            throw new BadRequestException('Se requiere especificar el mes y el año');
        }
        return this.fuelService.getSummaryByMonth(parseInt(month, 10), parseInt(year, 10));
    }
}