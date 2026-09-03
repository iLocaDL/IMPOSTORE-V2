import type { QuestionRepository, QuestionSet } from "./types";

type QuestionSetRow = {
  id: string;
  normal_question: string;
  impostor_question: string;
};

export class D1QuestionRepository implements QuestionRepository {
  constructor(private readonly database: D1Database) {}

  async listActiveIds(): Promise<string[]> {
    const result = await this.database
      .prepare("SELECT id FROM question_sets WHERE active = 1 ORDER BY id")
      .all<{ id: string }>();

    return result.results.map((row) => row.id);
  }

  async getById(id: string): Promise<QuestionSet | null> {
    const row = await this.database
      .prepare(
        "SELECT id, normal_question, impostor_question FROM question_sets WHERE id = ?1 AND active = 1"
      )
      .bind(id)
      .first<QuestionSetRow>();

    return row
      ? {
          id: row.id,
          normalQuestion: row.normal_question,
          impostorQuestion: row.impostor_question,
        }
      : null;
  }
}
