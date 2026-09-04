import { isQuestionCategory } from "../../src/shared/types";
import type { QuestionCategory, QuestionRepository, QuestionSet } from "./types";

type QuestionSetRow = {
  id: string;
  normal_question: string;
  impostor_question: string;
  category: string;
};

export class D1QuestionRepository implements QuestionRepository {
  constructor(private readonly database: D1Database) {}

  async listActiveIds(categories: readonly QuestionCategory[]): Promise<string[]> {
    if (categories.length === 0) {
      return [];
    }

    const placeholders = categories.map((_, index) => `?${index + 1}`).join(", ");
    const result = await this.database
      .prepare(
        `SELECT id FROM question_sets WHERE active = 1 AND category IN (${placeholders}) ORDER BY id`
      )
      .bind(...categories)
      .all<{ id: string }>();

    return result.results.map((row) => row.id);
  }

  async getById(id: string): Promise<QuestionSet | null> {
    const row = await this.database
      .prepare(
        "SELECT id, normal_question, impostor_question, category FROM question_sets WHERE id = ?1 AND active = 1"
      )
      .bind(id)
      .first<QuestionSetRow>();

    return row && isQuestionCategory(row.category)
      ? {
          id: row.id,
          normalQuestion: row.normal_question,
          impostorQuestion: row.impostor_question,
          category: row.category,
        }
      : null;
  }
}
