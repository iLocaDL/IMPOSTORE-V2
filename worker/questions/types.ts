import type { QuestionCategory } from "../../src/shared/types";

export type { QuestionCategory } from "../../src/shared/types";

export type QuestionSet = {
  id: string;
  normalQuestion: string;
  impostorQuestion: string;
  category: QuestionCategory;
};

export interface QuestionRepository {
  listActiveIds(categories: readonly QuestionCategory[]): Promise<string[]>;
  getById(id: string): Promise<QuestionSet | null>;
}
