import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { Public } from 'src/common/decorators/public.decorator';

@Controller()
export class HtmlController {
  @Public()
  @Get()
  getHome(@Res() res: Response) {
    res.sendFile(join(process.cwd(), 'static/index.html'));
  }
}
