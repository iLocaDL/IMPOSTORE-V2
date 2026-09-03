import { useState } from 'react'

import { LeaveRoomButton } from '../components/LeaveRoomButton'
import type { Player, RoomPhase } from '../../shared/types'

type AnsweringScreenProps = {
  phase: RoomPhase
  question: string | null
  players: Player[]
  answeredPlayerIds: string[]
  currentPlayerId: string | null
  errorMessage: string | null
  onSubmit: (answer: string) => void
  chatEnabled: boolean
  hostId: string | null
  unreadChatCount: number
  onOpenChat: (playerId: string) => void
  onLeave: () => void
}

export function AnsweringScreen({
  phase,
  question,
  players,
  answeredPlayerIds,
  currentPlayerId,
  errorMessage,
  onSubmit,
  chatEnabled,
  hostId,
  unreadChatCount,
  onOpenChat,
  onLeave,
}: AnsweringScreenProps) {
  const [answerDraft, setAnswerDraft] = useState('')
  const [isEditingAnswer, setIsEditingAnswer] = useState(true)
  const [hasConfirmedAnswer, setHasConfirmedAnswer] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const hasSavedAnswer = currentPlayerId ? answeredPlayerIds.includes(currentPlayerId) : false
  const isAnswerConfirmed = hasConfirmedAnswer || hasSavedAnswer
  const answeredCount = players.filter((player) => answeredPlayerIds.includes(player.id)).length

  function handleConfirmAnswer() {
    const trimmedAnswer = answerDraft.trim()

    if (!trimmedAnswer) {
      setValidationError('Inserisci una risposta prima di confermare.')
      return
    }

    onSubmit(trimmedAnswer)
    setHasConfirmedAnswer(true)
    setIsEditingAnswer(false)
    setValidationError(null)
  }

  function handleEditAnswer() {
    setIsEditingAnswer(true)
  }

  return (
    <main className="page-container">
      <section className="home-card" aria-labelledby="answering-title">
        <header className="screen-header">
          <p className="eyebrow">Fase di scrittura</p>
          <h1 id="answering-title">La tua risposta</h1>
        </header>
        <p className="intro-text">La tua domanda e:</p>
        <p className="assigned-question">{question ?? 'Caricamento domanda...'}</p>

        <div className="form-section">
          <label htmlFor="player-answer">La tua risposta</label>
          <textarea
            id="player-answer"
            value={answerDraft}
            onChange={(event) => setAnswerDraft(event.target.value)}
            placeholder="Scrivi la tua risposta"
            disabled={phase !== 'answering' || !isEditingAnswer}
            required
          />
          {phase === 'answering' && (
            <button
              type="button"
              onClick={isEditingAnswer ? handleConfirmAnswer : handleEditAnswer}
              disabled={isEditingAnswer && (!answerDraft.trim() || !question)}
            >
              {isEditingAnswer ? 'Conferma' : 'Modifica'}
            </button>
          )}
        </div>

        {isAnswerConfirmed && !isEditingAnswer && (
          <p className="success-message">Risposta confermata</p>
        )}
        {isAnswerConfirmed && isEditingAnswer && (
          <p className="intro-text">Modifica la risposta e conferma di nuovo.</p>
        )}
        {errorMessage && <p className="error-message">{errorMessage}</p>}
        {validationError && <p className="error-message">{validationError}</p>}
        {chatEnabled && hostId ? (
          <button type="button" className="secondary-button" onClick={() => onOpenChat(hostId)}>
            Chat con host{unreadChatCount > 0 && <span className="chat-badge">{unreadChatCount}</span>}
          </button>
        ) : null}

        <section className="answer-status" aria-labelledby="answer-status-title">
          <h2 id="answer-status-title" className="answers-status-summary">
            Stato risposte: {answeredCount}/{players.length}
          </h2>
        </section>
        <LeaveRoomButton onLeave={onLeave} />
      </section>
    </main>
  )
}
