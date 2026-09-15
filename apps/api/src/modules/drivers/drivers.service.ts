import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@Injectable()
export class DriversService {
    constructor(private prisma: PrismaService) { }

    async create(createDriverDto: CreateDriverDto) {
        // Verificar si el documento ya existe
        const existing = await this.prisma.driver.findUnique({
            where: { document: createDriverDto.document },
        });

        if (existing) {
            throw new ConflictException(`El conductor con documento ${createDriverDto.document} ya existe`);
        }

        return this.prisma.driver.create({
            data: {
                ...createDriverDto,
                licenseExpiry: createDriverDto.licenseExpiry
                    ? new Date(createDriverDto.licenseExpiry)
                    : null,
            },
        });
    }

    async findAll() {
        return this.prisma.driver.findMany({
            where: { active: true },
            orderBy: { fullName: 'asc' },
        });
    }

    async findOne(id: number) {
        const driver = await this.prisma.driver.findUnique({
            where: { id },
            include: {
                user: true,
            },
        });

        if (!driver) {
            throw new NotFoundException(`Conductor con ID ${id} no encontrado`);
        }

        return driver;
    }

    async update(id: number, updateDriverDto: UpdateDriverDto) {
        await this.findOne(id);

        const data: any = { ...updateDriverDto };

        if (updateDriverDto.licenseExpiry) {
            data.licenseExpiry = new Date(updateDriverDto.licenseExpiry);
        }

        return this.prisma.driver.update({
            where: { id },
            data,
        });
    }

    async remove(id: number) {
        await this.findOne(id);
        return this.prisma.driver.update({
            where: { id },
            data: { active: false },
        });
    }

    async getInactiveDrivers() {
        return this.prisma.driver.findMany({
            where: { active: false },
            orderBy: { fullName: 'asc' },
        });
    }

    async getDriversByLicenseExpiry(days: number = 30) {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + days);

        return this.prisma.driver.findMany({
            where: {
                licenseExpiry: {
                    lte: futureDate,
                    gte: today,
                },
            },
            orderBy: { licenseExpiry: 'asc' },
        });
    }
}