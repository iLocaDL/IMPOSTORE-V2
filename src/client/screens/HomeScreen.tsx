import { useEffect, useState } from 'react'
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
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false)
  const isPending = Boolean(pendingMode)

  useEffect(() => {
    if (!isHowToPlayOpen) {
      return
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsHowToPlayOpen(false)
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isHowToPlayOpen])

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
        <span>IMPOSTOR</span>
        <span>IMPOSTEUR</span>
        <span>DIVERTIMANT</span>
        <span>bugie</span>
        <span>ANSWERS</span>
        <span>SWAG</span>
        <span>MISTERO</span>
        <span>FALSO</span>
        <span>VERO</span>
      </div>
      <section className="home-card home-screen-card" aria-labelledby="page-title">
        <button
          type="button"
          className="home-help-button"
          aria-label="Apri Come giocare"
          aria-haspopup="dialog"
          onClick={() => setIsHowToPlayOpen(true)}
          disabled={isPending}
        >
          ?
        </button>
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

      {isHowToPlayOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsHowToPlayOpen(false)
            }
          }}
        >
          <section
            className="home-card how-to-play-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="how-to-play-title"
          >
            <header className="screen-header how-to-play-header">
              <p className="eyebrow">Guida rapida</p>
              <h1 id="how-to-play-title">Come giocare</h1>
            </header>
            <p className="intro-text how-to-play-intro">
              Tutti ricevono la stessa domanda, eccetto l’impostore che ne riceve una leggermente diversa. Dopo le risposte, il gruppo deve capire chi era.
            </p>
            <div className="how-to-play-sections">
              <section>
                <h2>Classica</h2>
                <p>Il gioco sceglie automaticamente le domande e assegna l’impostore. L'host conduce i vari step e partecipa al gioco.</p>
              </section>
              <section>
                <h2>Manuale</h2>
                <p>L’host non partecipa al gioco ma prepara le domande, sceglie l’impostore e conduce i vari step.</p>
              </section>
            </div>
            <button type="button" className="how-to-play-close" onClick={() => setIsHowToPlayOpen(false)}>
              Chiudi
            </button>
          </section>
        </div>
      )}
    </main>
  )
}
