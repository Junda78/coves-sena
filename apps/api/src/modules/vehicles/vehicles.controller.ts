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
} from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, VehicleStatus } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Controller('vehicles')
export class VehiclesController {
    constructor(private readonly vehiclesService: VehiclesService) {}

    @Post()
    create(@Body() createVehicleDto: CreateVehicleDto) {
        return this.vehiclesService.create(createVehicleDto);
    }

    @Get()
    findAll() {
        return this.vehiclesService.findAll();
    }

    @Get('by-status')
    findByStatus(@Query('status') status: VehicleStatus) {
        return this.vehiclesService.getVehiclesByStatus(status);
    }

    @Get('expiring')
    getExpiringVehicles() {
        return this.vehiclesService.getExpiringVehicles();
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.vehiclesService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateVehicleDto: UpdateVehicleDto) {
        return this.vehiclesService.update(id, updateVehicleDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.vehiclesService.remove(id);
    }
}