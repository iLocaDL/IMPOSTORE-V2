import { useState } from 'react'
import type { FormEvent } from 'react'

import type { ChatMessage, Player } from '../../shared/types'
import { LeaveRoomButton } from '../components/LeaveRoomButton'

type ChatScreenProps = {
  currentPlayerId: string | null
  partner: Player
  messages: ChatMessage[]
  onBack: () => void
  onSend: (text: string) => void
  onLeave: () => void
}

export function ChatScreen({ currentPlayerId, partner, messages, onBack, onSend, onLeave }: ChatScreenProps) {
  const [text, setText] = useState('')

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (text.trim()) {
      onSend(text)
      setText('')
    }
  }

  return (
    <main className="page-container">
      <section className="home-card" aria-labelledby="chat-title">
        <button type="button" className="back-button" onClick={onBack}>
          Indietro
        </button>
        <h1 id="chat-title">Chat con {partner.name}</h1>
        <div className="chat-messages">
          {messages.length === 0 && <p className="chat-empty">Nessun messaggio. Inizia tu la conversazione.</p>}
          {messages.map((message) => (
            <p
              key={message.id}
              className={message.fromPlayerId === currentPlayerId ? 'chat-message own-message' : 'chat-message'}
            >
              {message.text}
            </p>
          ))}
        </div>
        <form className="form-section" onSubmit={sendMessage}>
          <label htmlFor="chat-text">Messaggio</label>
          <textarea
            id="chat-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Scrivi un messaggio"
            required
          />
          <button type="submit" disabled={!text.trim()}>
            Invia
          </button>
        </form>
        <LeaveRoomButton onLeave={onLeave} />
      </section>
    </main>
  )
}
