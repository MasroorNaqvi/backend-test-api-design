import { Module } from '@nestjs/common';
import { FacebookController } from './controllers/facebook.controller';
import { FacebookService } from './services/facebook.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [FacebookController],
  providers: [FacebookService],
})
export class FacebookModule {}
