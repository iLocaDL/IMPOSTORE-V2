import { useState } from 'react'

import {
  DEFAULT_CLASSIC_CATEGORIES,
  QUESTION_CATEGORIES,
} from '../../shared/types'
import type { GameMode, QuestionCategory } from '../../shared/types'

type GameModeScreenProps = {
  onSelectMode: (mode: GameMode, classicCategories?: QuestionCategory[]) => void
  onBack: () => void
}

export function GameModeScreen({ onSelectMode, onBack }: GameModeScreenProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null)
  const [classicCategories, setClassicCategories] = useState<QuestionCategory[]>([
    ...DEFAULT_CLASSIC_CATEGORIES,
  ])

  function toggleCategory(category: QuestionCategory) {
    setClassicCategories((selectedCategories) =>
      selectedCategories.includes(category)
        ? selectedCategories.filter((item) => item !== category)
        : QUESTION_CATEGORIES.filter(
            (item) => item === category || selectedCategories.includes(item),
          ),
    )
  }

  const hasValidClassicSelection = selectedMode !== 'classic' || classicCategories.length > 0

  return (
    <main className="page-container">
      <section className="home-card" aria-labelledby="game-mode-title">
        <button type="button" className="back-button" onClick={onBack}>
          Indietro
        </button>
        <header className="screen-header">
          <p className="eyebrow">Nuova stanza</p>
          <h1 id="game-mode-title">Scegli la modalità</h1>
        </header>
        <p className="intro-text">Come vuoi preparare il prossimo round?</p>

        <div className="mode-choice-list">
          <button
            type="button"
            className={`mode-choice ${selectedMode === 'manual' ? 'mode-choice--selected' : ''}`}
            aria-pressed={selectedMode === 'manual'}
            onClick={() => setSelectedMode('manual')}
          >
            <strong>Manuale</strong>
            <span>L’host prepara le domande e sceglie l’impostore.</span>
          </button>
          <button
            type="button"
            className={`mode-choice ${selectedMode === 'classic' ? 'mode-choice--selected' : ''}`}
            aria-pressed={selectedMode === 'classic'}
            onClick={() => setSelectedMode('classic')}
          >
            <strong>Classico</strong>
            <span>L'host partecipa al gioco.</span>
          </button>
        </div>

        {selectedMode === 'classic' && (
          <fieldset className="category-selection">
            <legend>Categorie di domande</legend>
            <p className="category-selection-help">Scegli almeno una categoria per creare il mazzo.</p>
            <div className="category-choice-list">
              {QUESTION_CATEGORIES.map((category) => (
                <label className="category-choice" key={category} htmlFor={`category-${category}`}>
                  <input
                    id={`category-${category}`}
                    type="checkbox"
                    checked={classicCategories.includes(category)}
                    onChange={() => toggleCategory(category)}
                  />
                  <span>
                    <strong>{formatCategory(category)}</strong>
                    {category === 'extra' && <small>Contenuti più espliciti o particolari.</small>}
                  </span>
                </label>
              ))}
            </div>
            {!hasValidClassicSelection && (
              <p className="error-message" role="alert">Seleziona almeno una categoria.</p>
            )}
          </fieldset>
        )}

        {selectedMode && (
          <button
            type="button"
            className="confirm-mode-button"
            disabled={!hasValidClassicSelection}
            onClick={() => onSelectMode(
              selectedMode,
              selectedMode === 'classic' ? classicCategories : undefined,
            )}
          >
            Conferma
          </button>
        )}
      </section>
    </main>
  )
}

function formatCategory(category: QuestionCategory) {
  return category.charAt(0).toUpperCase() + category.slice(1)
}
