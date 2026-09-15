import 'dotenv/config'; // <--- AGREGA ESTA LÍNEA AL PRINCIPIO
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createDriverUsers() {
    const drivers = await prisma.driver.findMany({ where: { active: true } });
    console.log(`Encontrados ${drivers.length} conductores activos`);

    for (const driver of drivers) {
        const existingUser = await prisma.user.findUnique({
            where: { username: driver.document },
        });

        if (existingUser) {
            console.log(`✓ Conductor ${driver.fullName} ya tiene usuario`);
            continue;
        }

        // La contraseña será la misma cédula
        const passwordHash = await bcrypt.hash(driver.document, 10);

        await prisma.user.create({
            data: {
                username: driver.document,
                passwordHash,
                fullName: driver.fullName,
                role: 'DRIVER',
                driver: { connect: { id: driver.id } },
            },
        });

        console.log(`✓ Usuario creado: ${driver.fullName} | User/Pass: ${driver.document}`);
    }

    console.log('\n✅ Proceso completado');
    await prisma.$disconnect();
}

createDriverUsers().catch(console.error);