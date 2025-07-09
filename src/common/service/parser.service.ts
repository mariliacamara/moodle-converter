import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';

interface Answer {
  text: string;
  correct: boolean;
}

interface Question {
  title: string;
  statement: string;
  answers: Answer[];
}

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

      // Separar enunciado e alternativas
      const match = raw.match(/^(.*?)(?=\n?[A-D](?:\s|\n|Resposta))/);
      if (!match) continue;
      const statement = match[1].trim();
      const alternativesText = raw.substring(match[0].length).trim();

      // Extrair alternativas
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
        title: `Questão ${startIndex + questions.length}`,
        statement,
        answers,
      });
    }

    return questions;
  }

  parseQuestionsFromHTML(html: string, startIndex = 1): Question[] {
    const $ = cheerio.load(html);
    const questions: Question[] = [];

    $('.question-container').each((index, element) => {
      const qIndex = startIndex + index;
      const statement = $(element)
        .find('.question-text .ql-editor')
        .text()
        .trim();

      const answers: Answer[] = [];

      $(element)
        .find('.multiple-answer__dnd-item')
        .each((_, alt) => {
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

      if (statement && answers.length >= 2) {
        questions.push({
          title: `Questão ${qIndex}`,
          statement,
          answers,
        });
      }
    });

    return questions;
  }
}
