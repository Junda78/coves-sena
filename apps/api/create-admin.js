const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const plainPassword = 'Edwin12347';
    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        username: 'EdwinP',
        passwordHash: hashedPassword, // ✅ Coincide exactamente con tu schema
        fullName: 'Edwin Piedrahita', // ✅ Coincide exactamente con tu schema
        role: 'ADMIN',
        active: true, // ✅ Es Boolean en tu schema, no 1
      },
    });

    console.log('✅ Usuario administrador creado exitosamente:');
    console.log('👤 Nombre:', newUser.fullName);
    console.log('🔑 Usuario:', newUser.username);
    console.log('🔐 Contraseña:', plainPassword);
    console.log('🛡️  Rol:', newUser.role);
  } catch (error) {
    if (error.code === 'P2002') {
      console.error('❌ El nombre de usuario "EdwinP" ya existe en la base de datos.');
    } else {
      console.error('❌ Error al crear el usuario:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();