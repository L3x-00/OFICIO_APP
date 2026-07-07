import { Module } from '@nestjs/common';
import { CoverageService } from './coverage.service.js';

@Module({
  providers: [CoverageService],
  exports: [CoverageService],
})
export class CoverageModule {}
