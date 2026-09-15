import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    ParseIntPipe,
    Res, // ✅ AGREGADO: Faltaba este import
} from '@nestjs/common';
import type { Response } from 'express'; // ✅ CAMBIADO: Usar 'import type'
import { ChecklistsService } from './checklists.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';

@Controller('checklists')
export class ChecklistsController {
    constructor(private readonly checklistsService: ChecklistsService) { }

    @Post()
    create(@Body() createChecklistDto: CreateChecklistDto) {
        return this.checklistsService.create(createChecklistDto);
    }

    @Get()
    findAll() {
        return this.checklistsService.findAll();
    }

    @Get('vehicle/:vehicleId')
    getByVehicle(@Param('vehicleId', ParseIntPipe) vehicleId: number) {
        return this.checklistsService.getByVehicle(vehicleId);
    }

    @Get('driver/:driverId')
    getByDriver(@Param('driverId', ParseIntPipe) driverId: number) {
        return this.checklistsService.getByDriver(driverId);
    }

    @Get('by-date')
    getByDate(@Query('date') date: string) {
        return this.checklistsService.getByDate(date);
    }

    @Get('with-issues')
    getWithIssues() {
        return this.checklistsService.getChecklistsWithIssues();
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.checklistsService.findOne(id);
    }

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateChecklistDto: UpdateChecklistDto,
    ) {
        return this.checklistsService.update(id, updateChecklistDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.checklistsService.remove(id);
    }

    @Get(':id/export-gil-041')
    async exportGIL041(
        @Param('id', ParseIntPipe) id: number,
        @Res() res: Response, // ✅ Ahora sí funciona gracias a 'import type'
    ) {
        try {
            const { buffer, filename } = await this.checklistsService.exportGIL041(id);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(buffer);
        } catch (error: any) {
            res.status(500).json({ message: error.message || 'Error al generar el reporte' });
        }
    }
}