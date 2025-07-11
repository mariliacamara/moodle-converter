import { Injectable } from '@nestjs/common';
import { create } from 'xmlbuilder2';
interface Answer {
  text: string;
  correct: boolean;
}

interface Question {
  type?: 'multichoice' | 'essay';
  title: string;
  statement: string;
  answers?: Answer[];
}
@Injectable()
export class XMLService {
  // generateXML(questions: any[]): string {
  //   const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('quiz');

  //   for (const q of questions) {
  //     const qNode = root.ele('question', { type: 'multichoice' });
  //     qNode.ele('name').ele('text').txt(q.title);
  //     qNode
  //       .ele('questiontext', { format: 'html' })
  //       .ele('text')
  //       .dat(q.statement);
  //     qNode.ele('defaultgrade').txt('1.0000000');
  //     qNode.ele('penalty').txt('0.3333333');
  //     qNode.ele('hidden').txt('0');
  //     qNode.ele('single').txt('true');
  //     qNode.ele('shuffleanswers').txt('true');
  //     qNode.ele('answernumbering').txt('none');

  //     for (const a of q.answers) {
  //       const ans = qNode.ele('answer', { fraction: a.correct ? '100' : '0' });
  //       ans.ele('text').dat(a.text);
  //     }
  //   }

  //   return root.end({ prettyPrint: true });
  // }

  generateXML(questions: Question[]): string {
    const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('quiz');

    for (const q of questions) {
      const isEssay =
        q.type === 'essay' || !q.answers || q.answers.length === 0;
      const isVF =
        !isEssay &&
        q.answers?.length === 2 &&
        q.answers?.some((a) =>
          ['verdadeiro', 'falso'].includes(a.text.toLowerCase().trim()),
        );

      const qNode = root.ele('question', {
        type: isEssay ? 'essay' : 'multichoice',
      });

      qNode.ele('name').ele('text').txt(q.title);
      qNode
        .ele('questiontext', { format: 'html' })
        .ele('text')
        .dat(q.statement);

      qNode.ele('defaultgrade').txt('1.0000000');
      qNode.ele('penalty').txt(isEssay ? '0.0000000' : '0.3333333');
      qNode.ele('hidden').txt('0');

      if (isEssay) {
        qNode.ele('responseformat').txt('editor');
        qNode.ele('responsefieldlines').txt('10');
        qNode.ele('attachments').txt('0');
        qNode.ele('graderinfo', { format: 'html' }).ele('text').dat('');
        qNode.ele('responsetemplate', { format: 'html' }).ele('text').dat('');
      } else {
        qNode.ele('single').txt('true');
        qNode.ele('shuffleanswers').txt(isVF ? 'false' : 'true');
        qNode.ele('answernumbering').txt('none');

        if (q.answers) {
          for (const a of q.answers) {
            const ans = qNode.ele('answer', {
              fraction: a.correct ? '100' : '0',
            });
            ans.ele('text').dat(a.text);
          }
        }
      }
    }

    return root.end({ prettyPrint: true });
  }
}
