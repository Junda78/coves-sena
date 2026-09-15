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
    Res,
    Req,
    UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AgendaService } from './agenda.service';
import { CreateAgendaDto } from './dto/create-agenda.dto';
import { UpdateAgendaDto } from './dto/update-agenda.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('agenda')
@UseGuards(JwtAuthGuard)
export class AgendaController {
    constructor(private readonly agendaService: AgendaService) { }

    @Post()
    create(@Body() createAgendaDto: CreateAgendaDto) {
        return this.agendaService.create(createAgendaDto);
    }

    @Get()
    findAll(@Req() req: Request) {
        const user = (req as any).user;

        console.log('=== DEBUG AGENDA CONTROLLER ===');
        console.log('User from JWT:', user);
        console.log('User role:', user?.role);
        console.log('User driverId:', user?.driverId);
        console.log('Is DRIVER?', user?.role === 'DRIVER');

        if (user?.role === 'DRIVER') {
            console.log('Filtrando por driverId:', user.driverId);
            return this.agendaService.getServicesByDriver(user.driverId);
        }

        console.log('Mostrando TODOS los servicios (admin u otro rol)');
        return this.agendaService.findAll();
    }

    @Get('weekly')
    getWeeklyAgenda(
        @Query('year', ParseIntPipe) year: number,
        @Query('week', ParseIntPipe) weekNumber: number,
        @Req() req: Request,
    ) {
        const user = (req as any).user;
        if (user?.role === 'DRIVER') {
            return this.agendaService.getWeeklyAgendaByDriver(year, weekNumber, user.driverId);
        }
        return this.agendaService.getWeeklyAgenda(year, weekNumber);
    }

    @Get('by-date')
    getByDate(@Query('date') date: string, @Req() req: Request) {
        const user = (req as any).user;
        if (user?.role === 'DRIVER') {
            return this.agendaService.getServicesByDateAndDriver(new Date(date), user.driverId);
        }
        return this.agendaService.getServicesByDate(new Date(date));
    }

    @Get('vehicle/:vehicleId')
    getByVehicle(@Param('vehicleId', ParseIntPipe) vehicleId: number) {
        return this.agendaService.getServicesByVehicle(vehicleId);
    }

    @Get('driver/:driverId')
    getByDriver(@Param('driverId', ParseIntPipe) driverId: number) {
        return this.agendaService.getServicesByDriver(driverId);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.agendaService.findOne(id);
    }

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateAgendaDto: UpdateAgendaDto,
    ) {
        return this.agendaService.update(id, updateAgendaDto);
    }

    @Patch(':id/complete')
    completeService(
        @Param('id', ParseIntPipe) id: number,
        @Body('kmEnd') kmEnd?: number,
    ) {
        return this.agendaService.completeService(id, kmEnd);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.agendaService.remove(id);
    }

    @Get('export/monthly')
    async exportMonthlyReport(
        @Query('vehicleId', ParseIntPipe) vehicleId: number,
        @Query('month', ParseIntPipe) month: number,
        @Query('year', ParseIntPipe) year: number,
        @Res() res: Response,
    ) {
        try {
            const { buffer, filename } = await this.agendaService.exportMonthlyReport(vehicleId, month, year);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(buffer);
        } catch (error: any) {
            console.error('Error exportando reporte:', error);
            res.status(500).json({
                message: error.message || 'Error al generar el reporte',
            });
        }
    }
}