import { Injectable } from '@nestjs/common';
import { create } from 'xmlbuilder2';
import { Question } from '../interfaces/question.interface';

@Injectable()
export class XMLService {
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
        .dat(q.statement.trim());

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
            qNode
              .ele('answer', {
                fraction: a.correct ? '100' : '0',
              })
              .ele('text')
              .dat(a.text.trim());
          }
        }

        if (q.feedback) {
          qNode
            .ele('generalfeedback', { format: 'html' })
            .ele('text')
            .dat(this.toHTMLParagraphs(q.feedback?.trim()));
        }
      }
    }

    return root.end({ prettyPrint: true });
  }

  toHTMLParagraphs(text: string): string {
    return text
      .split('\n')
      .map((p) => `<p>${p.trim()}</p>`)
      .join('');
  }
}
