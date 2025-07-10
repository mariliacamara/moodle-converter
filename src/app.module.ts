import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { QuestionsModule } from './modules/questions/questions.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { HtmlController } from './modules/html/html.controller';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT || 6379),
      },
    }),
    QuestionsModule,
  ],
  controllers: [HtmlController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
