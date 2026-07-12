import { NestFactory } from '@nestjs/core';
import { json, raw, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  // Stripe requires the raw payload for signature verification.
  app.use('/stripe/webhook', raw({ type: 'application/json' }));
  app.use(json());
  app.use(urlencoded({ extended: true }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
