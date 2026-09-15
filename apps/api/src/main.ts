import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { TimezoneInterceptor } from './common/interceptors/timezone.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ CORS
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'https://coves.senacgts.org',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ✅ INTERCEPTOR GLOBAL DE ZONA HORARIA (Bogotá UTC-5)
  app.useGlobalInterceptors(new TimezoneInterceptor());

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
  console.log(` Zona horaria configurada: America/Bogota (UTC-5)`);
  console.log(` Todas las fechas se convertirán automáticamente a hora de Colombia`);
}

bootstrap();