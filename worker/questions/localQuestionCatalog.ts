import type { QuestionSet } from "./types";

export const LOCAL_QUESTION_CATALOG: readonly QuestionSet[] = [
  {
    id: "dev-food-01",
    normalQuestion: "Qual è il piatto che ordineresti più volentieri?",
    impostorQuestion: "Qual è il piatto che non ordineresti mai?",
  },
  {
    id: "dev-travel-01",
    normalQuestion: "In quale città vorresti trascorrere un fine settimana?",
    impostorQuestion: "In quale città non vorresti vivere?",
  },
  {
    id: "dev-music-01",
    normalQuestion: "Quale canzone metteresti per iniziare una festa?",
    impostorQuestion: "Quale canzone farebbe finire subito una festa?",
  },
  {
    id: "dev-cinema-01",
    normalQuestion: "Quale film consiglieresti a tutti?",
    impostorQuestion: "Quale film non riguarderesti una seconda volta?",
  },
];
