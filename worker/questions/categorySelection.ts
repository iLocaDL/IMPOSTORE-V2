import {
  DEFAULT_CLASSIC_CATEGORIES,
  QUESTION_CATEGORIES,
  isQuestionCategory,
} from "../../src/shared/types";
import type { GameMode, QuestionCategory } from "../../src/shared/types";

export function parseQuestionCategories(value: unknown): QuestionCategory[] | null {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((category) => !isQuestionCategory(category))
  ) {
    return null;
  }

  return QUESTION_CATEGORIES.filter((category) => value.includes(category));
}

export function restoreClassicCategories(
  mode: GameMode,
  value: unknown
): QuestionCategory[] | null {
  if (mode !== "classic") {
    return null;
  }

  return parseQuestionCategories(value) ?? [...DEFAULT_CLASSIC_CATEGORIES];
}

export function haveSameCategories(
  first: readonly QuestionCategory[],
  second: readonly QuestionCategory[]
): boolean {
  return (
    first.length === second.length &&
    first.every((category) => second.includes(category))
  );
}

export function shouldResetQuestionDeck(
  deckCategories: unknown,
  selectedCategories: readonly QuestionCategory[]
): boolean {
  const parsedDeckCategories = parseQuestionCategories(deckCategories);

  return (
    !parsedDeckCategories ||
    !haveSameCategories(parsedDeckCategories, selectedCategories)
  );
}
