/* eslint-disable no-useless-escape */
import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { parseStringPromise } from 'xml2js';

interface Answer {
  text: string;
  correct: boolean;
}

type Question =
  | {
      type: 'essay';
      title: string;
      statement: string;
    }
  | {
      type: 'multichoice';
      title: string;
      statement: string;
      answers: Answer[];
      isVF?: boolean;
    };

@Injectable()
export class ParserService {
  parseQuestions(text: string, startIndex: number = 1): Question[] {
    const questions: Question[] = [];

    const blocks = text.split(/\|\s*M[úu]ltipla escolha\s*--\s*pontos/);

    for (let i = 1; i < blocks.length; i++) {
      const raw = blocks[i]
        .replace(/\n+/g, '\n')
        .replace(/\s+/g, ' ')
        .replace(/\s*Comentários automatizados.*/gi, '')
        .trim();

      const match = raw.match(/^(.*?)(?=\n?[A-D](?:\s|\n|Resposta))/);
      if (!match) continue;

      const statement = match[1].trim();
      const alternativesText = raw.substring(match[0].length).trim();

      const answerRegex =
        /([A-D])\s*(Resposta correta)?\s*([\s\S]*?)(?=(?:\n?[A-D]\s|$))/g;
      const answers: Answer[] = [];
      let m;
      while ((m = answerRegex.exec(alternativesText)) !== null) {
        const [, , correctTag, body] = m;
        const cleaned = body.replace(/Resposta correta/gi, '').trim();
        if (!cleaned) continue;
        answers.push({
          text: cleaned,
          correct: !!correctTag,
        });
      }

      if (answers.length < 2) continue;

      questions.push({
        type: 'multichoice',
        title: `Questão ${startIndex + questions.length}`,
        statement,
        answers,
      });
    }

    return questions;
  }

  async parseQuestionsFromXML(xml: string): Promise<Question[]> {
    const parsed = await parseStringPromise(xml);
    const questions: Question[] = [];

    for (const q of parsed.quiz.question || []) {
      const statement = q.questiontext?.[0]?.text?.[0]?.trim();

      const answers: Answer[] = [];
      for (const a of q.answer || []) {
        const text = a.text?.[0]?.trim() || '';
        const correct = a.$?.fraction === '100';
        if (text) {
          answers.push({ text, correct });
        }
      }

      if (!statement) continue;

      if (answers.length < 2) {
        questions.push({
          type: 'essay',
          title: q.name?.[0]?.text?.[0] || 'Questão sem título',
          statement,
        });
      } else {
        questions.push({
          type: 'multichoice',
          title: q.name?.[0]?.text?.[0] || 'Questão sem título',
          statement,
          answers,
        });
      }
    }

    return questions;
  }

  parseQuestionsFromHTML(html: string, startIndex = 1): Question[] {
    const $ = cheerio.load(html);
    const questions: Question[] = [];

    $('.question-container').each((index, element) => {
      const qIndex = startIndex + index;
      const $el = $(element);

      const statement = $el.find('.question-text .ql-editor').text().trim();

      const isEssay = $el.find('.essay').length > 0;

      if (isEssay) {
        questions.push({
          type: 'essay',
          title: `Questão ${qIndex}`,
          statement,
        });
        return;
      }

      const answers: Answer[] = [];

      const isTrueFalse = $(element).find('.true-false__list').length > 0;

      if (isTrueFalse) {
        const rawStatement = $(element)
          .find('.question-text .ql-editor')
          .text()
          .trim();
        const answers: Answer[] = [];

        $(element)
          .find('.true-false__list li')
          .each((_, li) => {
            const $li = $(li);
            const text = $li.find('.true-false__text').text().trim();
            const correct = $li.find('.true-false__correct').length > 0;

            console.log(text);
            console.log(correct);

            if (text) {
              answers.push({ text, correct });
            }
          });

        if (answers.length === 2) {
          questions.push({
            type: 'multichoice',
            title: `Questão ${qIndex}`,
            statement: rawStatement,
            answers,
            isVF: true,
          });
          return;
        }
      }

      $el.find('.multiple-answer__dnd-item').each((_, alt) => {
        const text = $(alt).find('.ql-editor.bb-editor').text().trim();
        const correct = $(alt)
          .find('.answer-feedback-container span')
          .text()
          .toLowerCase()
          .includes('resposta correta');

        if (text) {
          answers.push({ text, correct });
        }
      });

      if (answers.length < 2) return;

      questions.push({
        type: 'multichoice',
        title: `Questão ${qIndex}`,
        statement,
        answers,
      });
    });

    return questions;
  }

  extractQuestions(html: string) {
    const $ = cheerio.load(html);
    const questions: any[] = [];

    $('.question-text .ql-editor').each((_, el) => {
      const question = $(el).text().trim();
      const $container = $(el).closest('.base-question');

      const choices: string[] = [];
      let correctAnswer: string | null = null;

      $container.find('li.multiple-answer_dnd-item').each((_, li) => {
        const alt = $(li).find('.bb-editor-wrapper').text().trim();
        const correct = $(li).find('.multiple-answer-li__correct').length > 0;

        choices.push(alt);
        if (correct) correctAnswer = alt;
      });

      questions.push({
        question,
        choices,
        correctAnswer,
      });
    });

    return questions;
  }

  compareHtmlAndXml(
    htmlQuestions: Question[],
    xmlQuestions: Question[],
  ): Question[] {
    const seen = new Set<string>();
    const result: Question[] = [];

    for (const xmlQ of xmlQuestions) {
      if (xmlQ.type !== 'multichoice') continue;

      const xmlStatement = this.normalize(xmlQ.statement);
      const xmlCorrect = this.normalize(
        xmlQ.answers.find((a) => a.correct)?.text || '',
      );
      const key = `${xmlStatement}::${xmlCorrect}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const matchInHtml = htmlQuestions.some((htmlQ) => {
        if (htmlQ.type !== 'multichoice') return false;
        const htmlStatement = this.normalize(htmlQ.statement);
        const htmlCorrect = this.normalize(
          htmlQ.answers.find((a) => a.correct)?.text || '',
        );

        return (
          (htmlStatement.includes(xmlStatement) ||
            xmlStatement.includes(htmlStatement)) &&
          htmlCorrect === xmlCorrect
        );
      });

      if (matchInHtml) result.push(xmlQ);
    }

    return result;
  }

  removeDuplicateQuestions(questions: Question[]): Question[] {
    const seen = new Set<string>();
    const uniqueQuestions: Question[] = [];

    for (const q of questions) {
      const statement = this.normalize(q.statement);
      const correctAnswer =
        q.type === 'multichoice'
          ? this.normalize(q.answers.find((a) => a.correct)?.text || '')
          : '';
      const key = `${statement}::${correctAnswer}`;

      if (!seen.has(key)) {
        seen.add(key);
        uniqueQuestions.push(q);
      }
    }

    return uniqueQuestions;
  }

  normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u200B-\u200D\uFEFF\u00a0]/g, '')
      .replace(/[\s\n\r]+/g, ' ')
      .replace(/[-–—]/g, '-')
      .replace(/[“”"(){}\[\];.,!?]+$/g, '')
      .replace(/[:“”"(){}\[\];.,!?]/g, '')
      .trim();
  }
}
