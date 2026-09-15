import {
    IsString,
    IsInt,
    IsOptional,
    IsEnum,
    IsDateString,
    IsArray,
    ValidateNested,
    Min,
    Max,
    MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ChecklistCategory {
    DOCUMENTOS = 'DOCUMENTOS',
    DIRECCIONALES = 'DIRECCIONALES',
    LUCES = 'LUCES',
    LIMPIABRISAS = 'LIMPIABRISAS',
    FRENOS = 'FRENOS',
    LLANTAS = 'LLANTAS',
    ESPEJOS = 'ESPEJOS',
    PITO = 'PITO',
    FLUIDOS = 'FLUIDOS',
    APOYA_CABEZAS = 'APOYA_CABEZAS',
    CINTURONES = 'CINTURONES',
    MANTENIMIENTO = 'MANTENIMIENTO',
    VENCIMIENTOS = 'VENCIMIENTOS',
    EQUIPO_SEGURIDAD = 'EQUIPO_SEGURIDAD',
}

export enum CheckStatus {
    SI = 'SI',
    NO = 'NO',
    NA = 'NA',
}

export class CreateChecklistItemDto {
    @IsEnum(ChecklistCategory)
    category: ChecklistCategory;

    @IsString()
    @MaxLength(100)
    itemName: string;

    @IsEnum(CheckStatus)
    status: CheckStatus;

    @IsString()
    @MaxLength(500)
    @IsOptional()
    observation?: string;
}

export class CreateChecklistDto {
    @IsInt()
    @Min(1)
    vehicleId: number;

    @IsInt()
    @Min(1)
    driverId: number;

    @IsDateString()
    checklistDate: string;

    @IsInt()
    @Min(0)
    @IsOptional()
    km?: number;

    @IsInt()
    @Min(0)
    @Max(100)
    conformityScore: number;

    @IsString()
    @MaxLength(150)
    adminName: string;

    @IsString()
    @MaxLength(150)
    driverName: string;

    @IsString()
    @IsOptional()
    observations?: string;

    // ✅ CAMPO DE FIRMA AGREGADO
    @IsString()
    @IsOptional()
    signature?: string; // Base64 de la imagen de la firma

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateChecklistItemDto)
    items: CreateChecklistItemDto[];
}