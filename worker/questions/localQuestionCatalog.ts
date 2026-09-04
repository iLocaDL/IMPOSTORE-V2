import type { QuestionSet } from "./types";

export const LOCAL_QUESTION_CATALOG: readonly QuestionSet[] = [
  {
    id: "dev-food-01",
    normalQuestion: "Qual è il piatto che ordineresti più volentieri?",
    impostorQuestion: "Qual è il piatto che non ordineresti mai?",
    category: "testuali",
  },
  {
    id: "dev-travel-01",
    normalQuestion: "In quale città vorresti trascorrere un fine settimana?",
    impostorQuestion: "In quale città non vorresti vivere?",
    category: "testuali",
  },
  {
    id: "dev-music-01",
    normalQuestion: "Quale canzone metteresti per iniziare una festa?",
    impostorQuestion: "Quale canzone farebbe finire subito una festa?",
    category: "testuali",
  },
  {
    id: "dev-cinema-01",
    normalQuestion: "Quale film consiglieresti a tutti?",
    impostorQuestion: "Quale film non riguarderesti una seconda volta?",
    category: "testuali",
  },
  {
    id: "dev-number-01",
    normalQuestion: "Quanti film guardi in un mese?",
    impostorQuestion: "Quante volte al mese vai al cinema?",
    category: "numeriche",
  },
  {
    id: "dev-extra-01",
    normalQuestion: "Qual è la figuraccia più assurda che hai fatto?",
    impostorQuestion: "Quale figuraccia non racconteresti mai in famiglia?",
    category: "extra",
  },
];
