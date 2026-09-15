import {
    IsString,
    IsInt,
    IsOptional,
    IsEnum,
    IsDateString,
    Min,
    Max,
    MaxLength,
} from 'class-validator';

export enum ActivityType {
    INTERNA = 'INTERNA',
    EXTERNA = 'EXTERNA',
    PERSONAL = 'PERSONAL',
    MANTENIMIENTO = 'MANTENIMIENTO',
    URGENCIA = 'URGENCIA',
}

export enum ServiceStatus {
    PROGRAMADO = 'PROGRAMADO',
    EN_CURSO = 'EN_CURSO',
    COMPLETADO = 'COMPLETADO',
    CANCELADO = 'CANCELADO',
}

export class CreateAgendaDto {
    @IsDateString()
    serviceDate: string;

    @IsString()
    @MaxLength(5)
    startTime: string;

    @IsString()
    @MaxLength(5)
    @IsOptional()
    endTime?: string;

    @IsInt()
    @Min(1)
    vehicleId: number;

    @IsInt()
    @Min(1)
    driverId: number;

    @IsEnum(ActivityType)
    activityType: ActivityType;

    @IsString()
    @MaxLength(200)
    title: string;

    @IsString()
    @MaxLength(255)
    @IsOptional()
    destination?: string;

    @IsInt()
    @Min(0)
    @IsOptional()
    kmStart?: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    kmEnd?: number;

    @IsString()
    @MaxLength(150)
    @IsOptional()
    requester?: string;

    @IsEnum(ServiceStatus)
    @IsOptional()
    status?: ServiceStatus;

    @IsInt()
    @Min(1)
    @Max(52)
    weekNumber: number;

    @IsInt()
    @Min(2020)
    @Max(2100)
    year: number;
}