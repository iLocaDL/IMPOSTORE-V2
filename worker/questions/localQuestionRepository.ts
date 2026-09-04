import { LOCAL_QUESTION_CATALOG } from "./localQuestionCatalog";
import type { QuestionCategory, QuestionRepository, QuestionSet } from "./types";

export class LocalQuestionRepository implements QuestionRepository {
  async listActiveIds(categories: readonly QuestionCategory[]): Promise<string[]> {
    const selectedCategories = new Set(categories);

    return LOCAL_QUESTION_CATALOG
      .filter((questionSet) => selectedCategories.has(questionSet.category))
      .map((questionSet) => questionSet.id);
  }

  async getById(id: string): Promise<QuestionSet | null> {
    return LOCAL_QUESTION_CATALOG.find((questionSet) => questionSet.id === id) ?? null;
  }
}
