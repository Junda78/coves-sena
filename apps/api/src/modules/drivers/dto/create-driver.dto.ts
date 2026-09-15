import { IsString, IsOptional, IsBoolean, MaxLength, IsDateString } from 'class-validator';

export class CreateDriverDto {
    @IsString()
    @MaxLength(150)
    fullName: string;

    @IsString()
    @MaxLength(20)
    document: string;

    @IsString()
    @MaxLength(30)
    @IsOptional()
    licenseNumber?: string;

    @IsString()
    @MaxLength(5)
    @IsOptional()
    licenseCategory?: string;

    @IsDateString()
    @IsOptional()
    licenseExpiry?: string;

    @IsString()
    @MaxLength(20)
    @IsOptional()
    phone?: string;

    @IsBoolean()
    @IsOptional()
    active?: boolean = true;
}