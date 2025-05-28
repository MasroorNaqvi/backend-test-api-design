import { Module } from '@nestjs/common';
import { FacebookModule } from './modules/facebook/facebook.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    FacebookModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
