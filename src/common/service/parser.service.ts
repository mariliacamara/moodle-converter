// src/questions/parser.service.ts
import { Injectable } from '@nestjs/common';

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
  parseQuestions(text: string): Question[] {
    const questions: Question[] = [];

    const blocks = text.split(/\|\s*M[úu]ltipla escolha\s*--\s*pontos/);

    for (let i = 1; i < blocks.length; i++) {
      const raw = blocks[i]
        .replace(/\n+/g, '\n')
        .replace(/\s+/g, ' ')
        .replace(/\s*Comentários automatizados.*/gi, '')
        .replace(/\d+-\d+ de \d+ itens por página\d+/g, '')
        .trim();

      // Separar enunciado e alternativas
      const match = raw.match(/^(.*?)(?=\n?[A-D](\s|Resposta|\n))/);
      if (!match) continue;
      const statement = match[1].trim();
      const alternativesText = raw.substring(match[0].length).trim();

      // Corrigir alternativas coladas (ex: ATexto BTexto) adicionando quebras
      const normalized = alternativesText.replace(
        /([A-D])\s*(Resposta correta)?\s*(?=[A-D](\s|Resposta|\n|$))/g,
        '$1$2\n',
      );

      // Extrair alternativas
      const answerRegex =
        /([A-D])\s*(Resposta correta)?\s*((?:[^A-D](?!\s*[A-D]\s))+)/gi;
      const answers: Answer[] = [];
      let m;
      while ((m = answerRegex.exec(normalized)) !== null) {
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
        title: `Questão ${questions.length + 1}`,
        statement,
        answers,
      });
    }

    return questions;
  }
}
