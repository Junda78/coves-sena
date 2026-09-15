import { IsString, IsInt, IsOptional, IsEnum, Min, Max, MaxLength } from 'class-validator';

export enum FuelType {
    ACPM = 'ACPM',
    CORRIENTE = 'CORRIENTE',
    EXTRA = 'EXTRA',
    GAS = 'GAS',
}

export enum VehicleStatus {
    OPERATIVO = 'OPERATIVO',
    REVISAR = 'REVISAR',
    TALLER = 'TALLER',
    INACTIVO = 'INACTIVO',
}

export class CreateVehicleDto {
    @IsString()
    @MaxLength(10)
    plate: string;

    @IsString()
    @MaxLength(50)
    brand: string;

    @IsString()
    @MaxLength(50)
    model: string;

    @IsInt()
    @Min(1900)
    @Max(2100)
    @IsOptional()
    year?: number;

    @IsEnum(FuelType)
    fuelType: FuelType;

    @IsInt()
    @Min(0)
    @IsOptional()
    currentKm?: number;

    @IsString()
    @MaxLength(50)
    @IsOptional()
    chipCode?: string;

    @IsString()
    @IsOptional()
    soatExpiry?: string;

    @IsString()
    @IsOptional()
    tecnoExpiry?: string;

    @IsString()
    @IsOptional()
    insuranceExpiry?: string;

    @IsEnum(VehicleStatus)
    @IsOptional()
    status?: VehicleStatus;
}