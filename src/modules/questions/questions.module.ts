import { Module } from '@nestjs/common';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { PDFService } from '../../common/service/pdf.service';
import { ParserService } from '../../common/service/parser.service';
import { XMLService } from '../../common/service/xml.service';

@Module({
  controllers: [QuestionsController],
  providers: [QuestionsService, PDFService, ParserService, XMLService],
})
export class QuestionsModule {}
