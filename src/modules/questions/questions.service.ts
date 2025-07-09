import { Injectable } from '@nestjs/common';
import { PDFService } from '../../common/service/pdf.service';
import { ParserService } from '../../common/service/parser.service';
import { XMLService } from '../../common/service/xml.service';

@Injectable()
export class QuestionsService {
  constructor(
    private readonly pdfService: PDFService,
    private readonly parserService: ParserService,
    private readonly xmlService: XMLService,
  ) {}

  async convertPDFtoXML(pdfBuffer: Buffer): Promise<Buffer> {
    const text = await this.pdfService.extractText(pdfBuffer);
    const questions = this.parserService.parseQuestions(text);
    return Buffer.from(this.xmlService.generateXML(questions));
  }

  async convertMultiplePDFsToXML(
    files: Express.Multer.File[],
  ): Promise<Buffer> {
    const allQuestions: any = [];

    for (const file of files) {
      const text = await this.pdfService.extractText(file.buffer);
      const questions = this.parserService.parseQuestions(text);
      allQuestions.push(...questions);
    }

    const xml = this.xmlService.generateXML(allQuestions);
    return Buffer.from(xml);
  }
}
