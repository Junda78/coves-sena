import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    ParseIntPipe,
    Query,
} from '@nestjs/common';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@Controller('drivers')
export class DriversController {
    constructor(private readonly driversService: DriversService) { }

    @Post()
    create(@Body() createDriverDto: CreateDriverDto) {
        return this.driversService.create(createDriverDto);
    }

    @Get()
    findAll() {
        return this.driversService.findAll();
    }

    @Get('inactive')
    getInactive() {
        return this.driversService.getInactiveDrivers();
    }

    @Get('license/expiring')
    getLicenseExpiring(@Query('days') days?: string) {
        const daysNumber = days ? parseInt(days, 10) : 30;
        return this.driversService.getDriversByLicenseExpiry(daysNumber);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.driversService.findOne(id);
    }

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateDriverDto: UpdateDriverDto,
    ) {
        return this.driversService.update(id, updateDriverDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.driversService.remove(id);
    }
}