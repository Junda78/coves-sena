import { IsInt, Min, Max } from 'class-validator';

export class UploadFuelDto {
    @IsInt()
    @Min(1)
    @Max(12)
    month: number;

    @IsInt()
    @Min(2020)
    @Max(2100)
    year: number;
}