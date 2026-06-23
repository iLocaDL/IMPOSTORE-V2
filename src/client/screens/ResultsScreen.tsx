import type { RoundResult } from '../../shared/types'
import { LeaveRoomButton } from '../components/LeaveRoomButton'

type ResultsScreenProps = {
  results: RoundResult[]
  isHost: boolean
  onNewGame: () => void
  onLeave: () => void
}

export function ResultsScreen({ results, isHost, onNewGame, onLeave }: ResultsScreenProps) {
  const questionCounts = results.reduce<Record<string, number>>((counts, result) => {
    counts[result.question] = (counts[result.question] ?? 0) + 1
    return counts
  }, {})
  const impostorPlayerId = results.find((result) => questionCounts[result.question] === 1)?.playerId

  return (
    <main className="page-container">
      <section className="home-card" aria-labelledby="results-title">
        <header className="screen-header">
          <p className="eyebrow">Risultato del round</p>
          <h1 id="results-title">L’impostore è stato rivelato</h1>
        </header>
        <div className="results-list">
          {results.map((result) => (
            <article key={result.playerId} className={`result-card ${result.playerId === impostorPlayerId ? 'reveal-card' : ''}`}>
              {result.playerId === impostorPlayerId && <span className="impostor-badge">Impostore</span>}
              <h2>{result.playerName}</h2>
              <p className="result-question"><strong>Domanda ricevuta:</strong> {result.question}</p>
              <p><strong>Risposta:</strong> {result.answer}</p>
            </article>
          ))}
        </div>
        <div className="action-list">
          {isHost && <button type="button" onClick={onNewGame}>Nuova partita</button>}
          {!isHost && <p className="host-message">In attesa che l’host avvii una nuova partita.</p>}
        </div>
        <LeaveRoomButton onLeave={onLeave} />
      </section>
    </main>
  )
}
