import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { log } from 'node:console';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  await app.listen(process.env.PORT ?? 3000);
  console.log(`Server is running at http://localhost:3000`);
}
await bootstrap();
