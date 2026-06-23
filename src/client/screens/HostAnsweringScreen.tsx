import type { Player, PlayerAnswer } from '../../shared/types'
import { LeaveRoomButton } from '../components/LeaveRoomButton'

type HostAnsweringScreenProps = {
  activePlayers: Player[]
  answers: PlayerAnswer[]
  allPlayersAnswered: boolean
  unreadChatsByPlayerId: Record<string, number>
  onConfirm: () => void
  onOpenChat: (playerId: string) => void
  onLeave: () => void
}

export function HostAnsweringScreen({
  activePlayers,
  answers,
  allPlayersAnswered,
  unreadChatsByPlayerId,
  onConfirm,
  onOpenChat,
  onLeave,
}: HostAnsweringScreenProps) {
  return (
    <main className="page-container">
      <section className="home-card" aria-labelledby="host-answers-title">
        <header className="screen-header">
          <p className="eyebrow">Fase di scrittura</p>
          <h1 id="host-answers-title">Risposte dei giocatori</h1>
        </header>
        <p className="intro-text">
          {allPlayersAnswered ? 'Tutti i giocatori hanno risposto.' : 'In attesa delle risposte...'}
        </p>
        <div className="results-list">
          {activePlayers.map((player) => {
            const answer = answers.find((currentAnswer) => currentAnswer.playerId === player.id)

            return (
              <article key={player.id} className="result-card">
                <h2>{player.name}</h2>
                <p>{answer ? answer.answer : 'In attesa'}</p>
                <button type="button" className="secondary-button" onClick={() => onOpenChat(player.id)}>
                  Chat{unreadChatsByPlayerId[player.id] ? <span className="chat-badge">{unreadChatsByPlayerId[player.id]}</span> : null}
                </button>
              </article>
            )
          })}
        </div>
        {allPlayersAnswered && <button type="button" onClick={onConfirm}>Conferma</button>}
        <LeaveRoomButton onLeave={onLeave} />
      </section>
    </main>
  )
}
