import { useState } from 'react'
import type { FormEvent } from 'react'

type HomeScreenProps = {
  errorMessage: string | null
  initialPlayerName?: string
  initialRoomCode?: string
  pendingMode?: 'create' | 'join'
  onCreateRoom: (playerName: string) => void
  onJoinRoom: (playerName: string, roomId: string) => void
}

export function HomeScreen({
  errorMessage,
  initialPlayerName = '',
  initialRoomCode = '',
  pendingMode,
  onCreateRoom,
  onJoinRoom,
}: HomeScreenProps) {
  const [playerName, setPlayerName] = useState(initialPlayerName)
  const [roomCode, setRoomCode] = useState(initialRoomCode)
  const isPending = Boolean(pendingMode)

  function createRoom() {
    onCreateRoom(playerName.trim())
  }

  function joinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onJoinRoom(playerName.trim(), roomCode.trim().toUpperCase())
  }

  return (
    <main className="page-container home-screen" aria-busy={isPending}>
      <div className="home-floating-words" aria-hidden="true">
        <span>IMPOSTORE</span>
        <span>KING</span>
        <span>ZAZETT</span>
        <span>ADDOE</span>
        <span>FABRI</span>
        <span>IUS</span>
        <span>MISTERO</span>
        <span>FALSO</span>
        <span>VERO</span>
      </div>
      <section className="home-card" aria-labelledby="page-title">
        <header className="screen-header">
          <p className="eyebrow">Party game</p>
          <h1 id="page-title">Domande Impostore</h1>
        </header>
        <p className="intro-text">Crea una stanza o entra in una lobby esistente.</p>

        <section className="form-section">
          <label htmlFor="player-name">Il tuo nome</label>
          <input
            id="player-name"
            name="playerName"
            type="text"
            placeholder="Inserisci il tuo nome"
            autoComplete="name"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            disabled={isPending}
            required
          />
          <button type="button" onClick={createRoom} disabled={isPending || !playerName.trim()}>
            {pendingMode === 'create' ? 'Creazione stanza...' : 'Crea stanza'}
          </button>
        </section>

        <div className="section-divider" aria-hidden="true">oppure</div>

        <form className="form-section" onSubmit={joinRoom}>
          <label htmlFor="room-code">Codice stanza</label>
          <input
            id="room-code"
            name="roomCode"
            type="text"
            placeholder="Es. A7KQ"
            autoComplete="off"
            value={roomCode}
            onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
            maxLength={4}
            disabled={isPending}
            required
          />
          <button
            type="submit"
            className="secondary-button"
            disabled={isPending || !playerName.trim() || !roomCode.trim()}
          >
            {pendingMode === 'join' ? 'Verifica stanza...' : 'Unisciti'}
          </button>
          {errorMessage && <p className="error-message">{errorMessage}</p>}
          {pendingMode === 'join' && <p className="pending-message">Connessione alla stanza in corso...</p>}
        </form>
      </section>
    </main>
  )
}
