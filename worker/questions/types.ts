export type QuestionSet = {
  id: string;
  normalQuestion: string;
  impostorQuestion: string;
};

export interface QuestionRepository {
  listActiveIds(): Promise<string[]>;
  getById(id: string): Promise<QuestionSet | null>;
}
