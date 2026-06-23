import type { Player, PlayerAnswer } from '../../shared/types'
import { LeaveRoomButton } from '../components/LeaveRoomButton'

type AnswersReadyScreenProps = {
  isHost: boolean
  activePlayers: Player[]
  answers: PlayerAnswer[]
  answersVisible: boolean
  onShowAnswers: () => void
  onShowResults: () => void
  onLeave: () => void
}

export function AnswersReadyScreen({
  isHost,
  activePlayers,
  answers,
  answersVisible,
  onShowAnswers,
  onShowResults,
  onLeave,
}: AnswersReadyScreenProps) {
  return (
    <main className="page-container">
      <section className="home-card" aria-labelledby="answers-ready-title">
        <header className="screen-header">
          <p className="eyebrow">Fase di lettura</p>
          <h1 id="answers-ready-title">Le risposte sono pronte</h1>
        </header>
        <p className="intro-text">
          {answersVisible ? 'Leggi le risposte: l’impostore non è ancora rivelato.' : 'Le risposte sono ancora coperte.'}
        </p>
        <div className="results-list">
          {activePlayers.map((player) => {
            const answer = answers.find((currentAnswer) => currentAnswer.playerId === player.id)

            return (
              <article key={player.id} className="result-card answer-card">
                <h2>{player.name}</h2>
                <p>{answersVisible ? answer?.answer ?? 'Nessuna risposta inviata' : '— — — — — —'}</p>
              </article>
            )
          })}
        </div>
        {isHost && !answersVisible && <button type="button" onClick={onShowAnswers}>Mostra</button>}
        {isHost && answersVisible && <button type="button" onClick={onShowResults}>Rivela l’impostore</button>}
        {!isHost && (
          <p className="host-message">
            {answersVisible ? 'In attesa che l’host riveli l’impostore.' : 'In attesa che l’host mostri le risposte.'}
          </p>
        )}
        <LeaveRoomButton onLeave={onLeave} />
      </section>
    </main>
  )
}
