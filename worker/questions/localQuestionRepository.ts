import { LOCAL_QUESTION_CATALOG } from "./localQuestionCatalog";
import type { QuestionRepository, QuestionSet } from "./types";

export class LocalQuestionRepository implements QuestionRepository {
  async listActiveIds(): Promise<string[]> {
    return LOCAL_QUESTION_CATALOG.map((questionSet) => questionSet.id);
  }

  async getById(id: string): Promise<QuestionSet | null> {
    return LOCAL_QUESTION_CATALOG.find((questionSet) => questionSet.id === id) ?? null;
  }
}
