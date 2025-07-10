import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Res,
  UploadedFiles,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { QuestionsService } from './questions.service';
import { Response } from 'express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

@Controller('questions')
@ApiTags('Questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Public()
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    const xmlBuffer = await this.questionsService.convertPDFtoXML(file.buffer);
    res.set({
      'Content-Type': 'application/xml',
      'Content-Disposition': 'attachment; filename=questions.xml',
    });
    res.send(xmlBuffer);
  }

  @Public()
  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @Res() res: Response,
  ) {
    const xmlBuffer =
      await this.questionsService.convertMultiplePDFsToXML(files);
    res.set({
      'Content-Type': 'application/xml',
      'Content-Disposition': 'attachment; filename=all_questions.xml',
    });
    res.send(xmlBuffer);
  }

  @Public()
  @Post('compare-html-xml')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
      required: ['files'],
    },
  })
  async compareHtmlWithXml(
    @UploadedFiles() files: Express.Multer.File[],
    @Res() res: Response,
  ) {
    const htmlFile = files.find((f) => f.mimetype.includes('html'));
    const xmlFile = files.find((f) => f.mimetype.includes('xml'));

    if (!htmlFile || !xmlFile) {
      return res
        .status(400)
        .json({ error: 'Envie um arquivo HTML e um XML para comparar.' });
    }

    const questions = await this.questionsService.compareHtmlWithXml(
      htmlFile.buffer,
      xmlFile.buffer,
    );

    return res.json({
      total: questions.length,
      questions,
    });
  }
}
