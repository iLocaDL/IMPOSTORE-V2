import { D1QuestionRepository } from "./d1QuestionRepository";
import { LocalQuestionRepository } from "./localQuestionRepository";
import type { QuestionRepository } from "./types";

type QuestionRepositoryEnv = {
  QUESTIONS_DB?: D1Database;
};

export function createQuestionRepository(env: QuestionRepositoryEnv): QuestionRepository {
  return env.QUESTIONS_DB
    ? new D1QuestionRepository(env.QUESTIONS_DB)
    : new LocalQuestionRepository();
}
