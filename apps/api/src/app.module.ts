import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { AgendaModule } from './modules/agenda/agenda.module';
import { ChecklistsModule } from './modules/checklists/checklists.module';
import { FuelModule } from './modules/fuel/fuel.module'; // Agrega esta línea

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    VehiclesModule,
    DriversModule,
    AgendaModule,
    ChecklistsModule,
    FuelModule, // Agrega esta línea
  ],
})
export class AppModule { }