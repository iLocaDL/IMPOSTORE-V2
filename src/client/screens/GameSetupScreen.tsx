import { useState } from 'react'
import type { FormEvent } from 'react'

import type { Player } from '../../shared/types'

type GameSetupScreenProps = {
  activePlayers: Player[]
  errorMessage: string | null
  onSubmit: (impostorPlayerId: string, normalQuestion: string, impostorQuestion: string) => void
}

export function GameSetupScreen({ activePlayers, errorMessage, onSubmit }: GameSetupScreenProps) {
  const [impostorPlayerId, setImpostorPlayerId] = useState(activePlayers[0]?.id ?? '')
  const [normalQuestion, setNormalQuestion] = useState('')
  const [impostorQuestion, setImpostorQuestion] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  function submitSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!impostorPlayerId || !normalQuestion.trim() || !impostorQuestion.trim()) {
      setValidationError('Completa tutte le informazioni del round.')
      return
    }

    setValidationError(null)
    onSubmit(impostorPlayerId, normalQuestion, impostorQuestion)
  }

  return (
    <form className="form-section setup-form" onSubmit={submitSetup}>
      <h2>Configura il round</h2>

      <label htmlFor="normal-question">Domanda normale</label>
      <textarea
        id="normal-question"
        value={normalQuestion}
        onChange={(event) => setNormalQuestion(event.target.value)}
        required
      />

      <label htmlFor="impostor-question">Domanda impostore</label>
      <textarea
        id="impostor-question"
        value={impostorQuestion}
        onChange={(event) => setImpostorQuestion(event.target.value)}
        required
      />

      <div className="impostor-selection" aria-labelledby="impostor-player-label">
        <span id="impostor-player-label" className="impostor-selection-label">Scegli l’impostore</span>
        <div className="impostor-player-list">
        {activePlayers.map((player) => (
          <button
            type="button"
            key={player.id}
            aria-pressed={impostorPlayerId === player.id}
            className={`impostor-player-card ${impostorPlayerId === player.id ? 'impostor-player-card--selected' : ''}`}
            onClick={() => setImpostorPlayerId(player.id)}
          >
            {player.name}
          </button>
        ))}
        </div>
      </div>

      {(validationError || errorMessage) && (
        <p className="error-message">{validationError ?? errorMessage}</p>
      )}
      <button type="submit">Avvia round</button>
    </form>
  )
}
