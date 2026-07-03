import { Module } from '@nestjs/common';
import { ReportCardController } from './report-card.controller';
import { ReportCardService } from './report-card.service';

@Module({
  controllers: [ReportCardController],
  providers:   [ReportCardService],
})
export class ReportCardModule {}
