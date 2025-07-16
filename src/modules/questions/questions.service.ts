import { Injectable } from '@nestjs/common';
import { PDFService } from '../../common/service/pdf.service';
import { ParserService } from '../../common/service/parser.service';
import { XMLService } from '../../common/service/xml.service';
import * as mime from 'mime-types';
import { Logger } from '@nestjs/common';

@Injectable()
export class QuestionsService {
  private readonly logger = new Logger(QuestionsService.name);

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

    this.logger.log(`📝 Processando ${files.length} arquivo(s)...`);

    for (const file of files) {
      const mimeType = mime.lookup(file.originalname);
      this.logger.log(`➡️ Arquivo: ${file.originalname} (${mimeType})`);

      let questions: any[] = [];

      try {
        if (mimeType === 'application/pdf') {
          this.logger.log('📄 Extraindo texto de PDF...');
          const text = await this.pdfService.extractText(file.buffer);
          questions = this.parserService.parseQuestions(text, count);
        } else if (mimeType === 'text/html') {
          this.logger.log('🌐 Extraindo questões do HTML...');
          const html = file.buffer.toString('utf-8');
          questions = this.parserService.parseQuestionsFromHTML(html, count);
        } else {
          this.logger.warn(`⚠️ Tipo de arquivo não suportado: ${mimeType}`);
          continue;
        }
      } catch (err) {
        console.error(
          `❌ Erro ao processar ${file.originalname}:`,
          err.message,
        );
        continue;
      }

      this.logger.log(
        `✅ ${questions.length} questão(ões) extraída(s) de ${file.originalname}`,
      );

      count += questions.length;
      allQuestions.push(...questions);
    }

    this.logger.log(`📦 Total de questões combinadas: ${allQuestions.length}`);

    const xml = this.xmlService.generateXML(allQuestions);
    return Buffer.from(xml);
  }

  async compareHtmlWithXml(htmlFile: Buffer, xmlFile: Buffer): Promise<any> {
    const html = htmlFile.toString('utf-8');
    const xmlText = xmlFile.toString('utf-8');

    const htmlQuestions = this.parserService.parseQuestionsFromHTML(html);
    const xmlQuestionsRaw =
      await this.parserService.parseQuestionsFromXML(xmlText);
    const xmlQuestions =
      this.parserService.removeDuplicateQuestions(xmlQuestionsRaw);

    const matched: typeof htmlQuestions = [];
    const notFound: typeof htmlQuestions = [];
    const duplicated: typeof htmlQuestions = [];

    const matchedKeys = new Set<string>();

    const getNormalizedCorrectAlternative = (q: any): string =>
      this.parserService.normalizeText(
        q.answers.find((a: any) => a.correct)?.text || '',
      );

    for (const htmlQ of htmlQuestions) {
      const normalizedHTML = this.parserService.normalizeText(htmlQ.statement);
      const htmlCorrect = getNormalizedCorrectAlternative(htmlQ);

      let found: any = null;

      for (const xmlQ of xmlQuestions) {
        const normXml = this.parserService.normalizeText(xmlQ.statement);
        const xmlCorrect = getNormalizedCorrectAlternative(xmlQ);

        if (normXml === normalizedHTML && xmlCorrect === htmlCorrect) {
          found = xmlQ;
          break;
        }

        if (normXml === normalizedHTML && xmlCorrect !== htmlCorrect) {
          this.logger.log(
            '⚠️ Mesmo enunciado mas alternativas diferentes:',
            htmlQ.title,
          );
        } else if (normXml !== normalizedHTML && xmlCorrect === htmlCorrect) {
          this.logger.log(
            '⚠️ Alternativa igual mas enunciado diferente:',
            htmlQ.title,
          );
        }
      }

      if (found) {
        const key = `${normalizedHTML}::${htmlCorrect}`;
        if (matchedKeys.has(key)) {
          duplicated.push(htmlQ);
        } else {
          matched.push(found);
          matchedKeys.add(key);
        }
      } else {
        notFound.push(htmlQ);
      }
    }

    return {
      matched,
      duplicated,
      notFound,
    };
  }

  sanitizeFilename(filename: string): string {
    return filename
      .normalize('NFD') // separa acentos de letras
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/\.[^/.]+$/, '') // remove a extensão
      .replace(/[^\w\d_-]+/g, '_') // troca tudo que não é alfanumérico por _
      .replace(/_+/g, '_') // remove múltiplos _
      .replace(/^_+|_+$/g, '') // remove _ no começo/fim
      .substring(0, 64); // evita nomes longos
  }
}
