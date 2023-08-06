import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  // Create the Nest application by importing AppModule
  const app = await NestFactory.create(AppModule);

  // Configure global validation pipe to transform and whitelist incoming data
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Automatically transform incoming data to the expected types.
      whitelist: true, // Remove any properties that do not have a corresponding decorator in the DTO.
      transformOptions: {
        enableImplicitConversion: true, // Enable implicit type conversion when validating DTOs.
      },
    }),
  );

  // Start the application and listen on port 3000
  await app.listen(3000);
  console.log('Server started on port 3000');
}

// Start the application bootstrap process
bootstrap();
