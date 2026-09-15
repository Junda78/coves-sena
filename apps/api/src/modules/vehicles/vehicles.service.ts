import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateVehicleDto, VehicleStatus } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
    constructor(private prisma: PrismaService) { }

    async create(createVehicleDto: CreateVehicleDto) {
        // Verificar si la placa ya existe
        const existing = await this.prisma.vehicle.findUnique({
            where: { plate: createVehicleDto.plate.toUpperCase() },
        });

        if (existing) {
            throw new ConflictException(`El vehículo con placa ${createVehicleDto.plate} ya existe`);
        }

        return this.prisma.vehicle.create({
            data: {
                ...createVehicleDto,
                plate: createVehicleDto.plate.toUpperCase(),
                soatExpiry: createVehicleDto.soatExpiry === '' ? null : (createVehicleDto.soatExpiry ? new Date(createVehicleDto.soatExpiry) : null),
                tecnoExpiry: createVehicleDto.tecnoExpiry === '' ? null : (createVehicleDto.tecnoExpiry ? new Date(createVehicleDto.tecnoExpiry) : null),
                insuranceExpiry: createVehicleDto.insuranceExpiry === '' ? null : (createVehicleDto.insuranceExpiry ? new Date(createVehicleDto.insuranceExpiry) : null),
            },
        });
    }

    async findAll() {
        return this.prisma.vehicle.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: number) {
        const vehicle = await this.prisma.vehicle.findUnique({
            where: { id },
        });

        if (!vehicle) {
            throw new NotFoundException(`Vehículo con ID ${id} no encontrado`);
        }

        return vehicle;
    }

    async update(id: number, updateVehicleDto: UpdateVehicleDto) {
        await this.findOne(id);

        const data: any = { ...updateVehicleDto };

        if (updateVehicleDto.plate) {
            data.plate = updateVehicleDto.plate.toUpperCase();
        }

        // Manejo explícito de fechas: si es "", convertir a null. Si tiene valor, convertir a Date.
        if (updateVehicleDto.soatExpiry !== undefined) {
            data.soatExpiry = updateVehicleDto.soatExpiry === '' ? null : new Date(updateVehicleDto.soatExpiry);
        }
        if (updateVehicleDto.tecnoExpiry !== undefined) {
            data.tecnoExpiry = updateVehicleDto.tecnoExpiry === '' ? null : new Date(updateVehicleDto.tecnoExpiry);
        }
        if (updateVehicleDto.insuranceExpiry !== undefined) {
            data.insuranceExpiry = updateVehicleDto.insuranceExpiry === '' ? null : new Date(updateVehicleDto.insuranceExpiry);
        }

        // Eliminar claves undefined para que Prisma no intente actualizarlas innecesariamente
        Object.keys(data).forEach(key => {
            if (data[key] === undefined) {
                delete data[key];
            }
        });

        return this.prisma.vehicle.update({
            where: { id },
            data,
        });
    }

    async remove(id: number) {
        await this.findOne(id);
        return this.prisma.vehicle.delete({
            where: { id },
        });
    }

    async getVehiclesByStatus(status: VehicleStatus) {
        return this.prisma.vehicle.findMany({
            where: { status: status as VehicleStatus },
            orderBy: { plate: 'asc' },
        });
    }
    async getExpiringVehicles() {
        const today = new Date();
        const next30Days = new Date();
        next30Days.setDate(today.getDate() + 30);

        const vehicles = await this.prisma.vehicle.findMany({
            where: {
                OR: [
                    { soatExpiry: { gte: today, lte: next30Days } },
                    { tecnoExpiry: { gte: today, lte: next30Days } },
                    { insuranceExpiry: { gte: today, lte: next30Days } },
                ],
            },
            select: {
                id: true,
                plate: true,
                brand: true,
                model: true,
                soatExpiry: true,
                tecnoExpiry: true,
                insuranceExpiry: true,
            },
        });

        const expiringItems: { plate: string; type: string; expiryDate: Date; daysLeft: number; }[] = [];

        vehicles.forEach(vehicle => {
            if (vehicle.soatExpiry) {
                const daysLeft = Math.ceil((vehicle.soatExpiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                expiringItems.push({
                    plate: vehicle.plate,
                    type: 'SOAT',
                    expiryDate: vehicle.soatExpiry,
                    daysLeft,
                });
            }
            if (vehicle.tecnoExpiry) {
                const daysLeft = Math.ceil((vehicle.tecnoExpiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                expiringItems.push({
                    plate: vehicle.plate,
                    type: 'Tecnomecánica',
                    expiryDate: vehicle.tecnoExpiry,
                    daysLeft,
                });
            }
            if (vehicle.insuranceExpiry) {
                const daysLeft = Math.ceil((vehicle.insuranceExpiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                expiringItems.push({
                    plate: vehicle.plate,
                    type: 'Seguro',
                    expiryDate: vehicle.insuranceExpiry,
                    daysLeft,
                });
            }
        });

        return expiringItems.sort((a, b) => a.daysLeft - b.daysLeft);
    }
}


