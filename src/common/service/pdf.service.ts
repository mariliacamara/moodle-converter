import { Injectable } from '@nestjs/common';
import * as pdf from 'pdf-parse';

@Injectable()
export class PDFService {
  async extractText(pdfBuffer: Buffer): Promise<string> {
    const data = await pdf(pdfBuffer);
    return data.text;
  }
}
