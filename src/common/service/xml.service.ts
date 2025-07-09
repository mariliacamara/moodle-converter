import { Injectable } from '@nestjs/common';
import { create } from 'xmlbuilder2';

@Injectable()
export class XMLService {
  generateXML(questions: any[]): string {
    const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('quiz');

    for (const q of questions) {
      const qNode = root.ele('question', { type: 'multichoice' });
      qNode.ele('name').ele('text').txt(q.title);
      qNode
        .ele('questiontext', { format: 'html' })
        .ele('text')
        .dat(q.statement);
      qNode.ele('defaultgrade').txt('1.0000000');
      qNode.ele('penalty').txt('0.3333333');
      qNode.ele('hidden').txt('0');
      qNode.ele('single').txt('true');
      qNode.ele('shuffleanswers').txt('true');
      qNode.ele('answernumbering').txt('none');

      for (const a of q.answers) {
        const ans = qNode.ele('answer', { fraction: a.correct ? '100' : '0' });
        ans.ele('text').dat(a.text);
      }
    }

    return root.end({ prettyPrint: true });
  }
}
