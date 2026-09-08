import { useState } from 'react'

import type { GameMode } from '../../shared/types'

type GameModeScreenProps = {
  onSelectMode: (mode: GameMode) => void
  onBack: () => void
}

export function GameModeScreen({ onSelectMode, onBack }: GameModeScreenProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null)
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

        {selectedMode && (
          <button
            type="button"
            className="confirm-mode-button"
            onClick={() => onSelectMode(selectedMode)}
          >
            Conferma
          </button>
        )}
      </section>
    </main>
  )
}
