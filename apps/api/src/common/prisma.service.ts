import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        super({
            log: ['query', 'info', 'warn', 'error'],
            datasources: {
                db: {
                    url: process.env.DATABASE_URL + '?timezone=-05:00',
                },
            },
        });
    }

    async onModuleInit() {
        await this.$connect();

        // ✅ Configurar zona horaria de MySQL a Colombia (UTC-5)
        await this.$executeRaw`SET time_zone = '-05:00'`;

        console.log('🕐 Zona horaria de base de datos configurada: America/Bogota (UTC-5)');
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}