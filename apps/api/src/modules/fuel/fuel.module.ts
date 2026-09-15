import { Module } from '@nestjs/common';
import { FuelService } from './fuel.service';
import { FuelController } from './fuel.controller';

@Module({
    controllers: [FuelController],
    providers: [FuelService],
    exports: [FuelService],
})
export class FuelModule { }