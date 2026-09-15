import { Module } from '@nestjs/common';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Module({
    imports: [
        // ✅ ESTO ES CLAVE: Le decimos a AgendaModule que use JwtModule
        // para que pueda resolver la dependencia de JwtService en el Guard
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'tu_clave_secreta_aqui',
            signOptions: { expiresIn: '24h' },
        }),
    ],
    controllers: [AgendaController],
    providers: [
        AgendaService,
        JwtAuthGuard, // ✅ Registramos el Guard aquí para que pueda inyectarse
    ],
    exports: [AgendaService],
})
export class AgendaModule { }