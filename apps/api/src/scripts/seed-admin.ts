// 1. ESTA LÍNEA DEBE IR PRIMERO DE TODO
import 'dotenv/config';

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as path from 'path';

// Opcional: forzar la ruta del .env si sigue fallando
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
    const passwordHash = await bcrypt.hash('ginna123', 10);

    const admin = await prisma.user.upsert({
        where: { username: 'ginna' },
        update: {},
        create: {
            username: 'ginna',
            passwordHash,
            fullName: 'Ginna López',
            role: 'ADMIN',
            active: true,
        },
    });

    console.log('✅ Usuario admin creado:', admin);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });