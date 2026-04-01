import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service.js';
import { ReviewsController } from './reviews.controller.js';
import { UploadController } from './upload.controller.js';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    MulterModule.register({ dest: './uploads' }),
  ],
  controllers: [ReviewsController, UploadController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}