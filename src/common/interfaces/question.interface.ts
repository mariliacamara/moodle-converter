import { Answer } from './answer.interface';

export interface Question {
  type?: 'multichoice' | 'essay';
  title: string;
  statement: string;
  answers?: Answer[];
  feedback?: string;
}
