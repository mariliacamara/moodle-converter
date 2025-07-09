import { Injectable } from '@nestjs/common';
import { PDFService } from '../../common/service/pdf.service';
import { ParserService } from '../../common/service/parser.service';
import { XMLService } from '../../common/service/xml.service';
import * as mime from 'mime-types';

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
    const allQuestions: any[] = [];
    let count = 1;

    console.log(`📝 Processando ${files.length} arquivo(s)...`);

    for (const file of files) {
      const mimeType = mime.lookup(file.originalname);
      console.log(`➡️ Arquivo: ${file.originalname} (${mimeType})`);

      let questions: any[] = [];

      try {
        if (mimeType === 'application/pdf') {
          console.log('📄 Extraindo texto de PDF...');
          const text = await this.pdfService.extractText(file.buffer);
          questions = this.parserService.parseQuestions(text, count);
        } else if (mimeType === 'text/html') {
          console.log('🌐 Extraindo questões do HTML...');
          const html = file.buffer.toString('utf-8');
          questions = this.parserService.parseQuestionsFromHTML(html, count);
        } else {
          console.warn(`⚠️ Tipo de arquivo não suportado: ${mimeType}`);
          continue;
        }
      } catch (err) {
        console.error(
          `❌ Erro ao processar ${file.originalname}:`,
          err.message,
        );
        continue;
      }

      console.log(
        `✅ ${questions.length} questão(ões) extraída(s) de ${file.originalname}`,
      );

      count += questions.length;
      allQuestions.push(...questions);
    }

    console.log(`📦 Total de questões combinadas: ${allQuestions.length}`);

    const xml = this.xmlService.generateXML(allQuestions);
    return Buffer.from(xml);
  }
}
