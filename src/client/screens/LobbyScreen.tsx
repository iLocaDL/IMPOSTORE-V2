import { useEffect, useState } from 'react'

import { LeaveRoomButton } from '../components/LeaveRoomButton'
import { PlayerCard } from '../components/PlayerCard'
import { useRoomRealtime } from '../hooks/useRoomRealtime'
import { cloudflareRealtimeTransport } from '../realtime/cloudflareRealtimeTransport'
import { AnsweringScreen } from './AnsweringScreen'
import { AnswersReadyScreen } from './AnswersReadyScreen'
import { ChatScreen } from './ChatScreen'
import { GameSetupScreen } from './GameSetupScreen'
import { HostAnsweringScreen } from './HostAnsweringScreen'
import { HomeScreen } from './HomeScreen'
import { ResultsScreen } from './ResultsScreen'
import type { GameMode, QuestionCategory } from '../../shared/types'

type LobbyScreenProps = {
  playerName: string
  roomId: string
  entryMode: 'create' | 'join'
  mode?: GameMode
  classicCategories?: QuestionCategory[]
  onLeave: () => void
  onJoinFailed: (message: string) => void
  onRoomClosed: (message: string) => void
}

export function LobbyScreen({
  playerName,
  roomId,
  entryMode,
  mode,
  classicCategories,
  onLeave,
  onJoinFailed,
  onRoomClosed,
}: LobbyScreenProps) {
  const [chatPartnerId, setChatPartnerId] = useState<string | null>(null)
  const {
    connectionStatus,
    roomState,
    currentPlayerId,
    isCurrentPlayerHost,
    errorMessage,
    yourQuestion,
    startGame,
    submitGameSetup,
    submitAnswer,
    confirmAnswers,
    showAnswers,
    showResults,
    startNewGame,
    sendChatMessage,
    markChatAsRead,
    leaveRoom,
  } = useRoomRealtime(
    roomId,
    playerName,
    entryMode,
    mode,
    classicCategories,
    onRoomClosed,
    cloudflareRealtimeTransport,
  )
  const players = roomState?.players ?? []
  const activePlayers = roomState?.mode === 'classic'
    ? players
    : players.filter((player) => player.id !== roomState?.hostId)
  const phase = roomState?.phase
  const chatEnabled = roomState?.mode === 'manual'
  const chatPartner = players.find((player) => player.id === chatPartnerId)
  const hasEntryConfirmation = Boolean(
    roomState && currentPlayerId && roomState.players.some((player) => player.id === currentPlayerId),
  )

  useEffect(() => {
    if (!roomState && errorMessage) {
      onJoinFailed(errorMessage)
    }
  }, [errorMessage, onJoinFailed, roomState])

  function openChat(partnerId: string) {
    if (!chatEnabled) {
      return
    }

    setChatPartnerId(partnerId)
    markChatAsRead(partnerId)
  }

  function exitRoom() {
    leaveRoom()
    onLeave()
  }

  if (!hasEntryConfirmation) {
    return (
      <HomeScreen
        errorMessage={errorMessage}
        initialPlayerName={playerName}
        initialRoomCode={entryMode === 'join' ? roomId : ''}
        pendingMode={entryMode}
        onCreateRoom={() => undefined}
        onJoinRoom={() => undefined}
      />
    )
  }

  if (chatEnabled && chatPartner && phase === 'answering') {
    const messages = (roomState?.game?.chatMessages ?? []).filter(
      (message) =>
        (message.fromPlayerId === currentPlayerId && message.toPlayerId === chatPartner.id) ||
        (message.fromPlayerId === chatPartner.id && message.toPlayerId === currentPlayerId),
    )

    return (
      <ChatScreen
        currentPlayerId={currentPlayerId}
        partner={chatPartner}
        messages={messages}
        onBack={() => setChatPartnerId(null)}
        onSend={(text) => sendChatMessage(chatPartner.id, text)}
        onLeave={exitRoom}
      />
    )
  }

  if (phase === 'answering') {
    if (isCurrentPlayerHost && roomState?.mode === 'manual') {
      return (
        <HostAnsweringScreen
          activePlayers={activePlayers}
          answers={roomState?.game?.answers ?? []}
          allPlayersAnswered={Boolean(roomState?.game?.allPlayersAnswered)}
          unreadChatsByPlayerId={roomState?.game?.unreadChatsByPlayerId ?? {}}
          onConfirm={confirmAnswers}
          onOpenChat={openChat}
          onLeave={exitRoom}
        />
      )
    }

    return (
      <AnsweringScreen
        phase={phase}
        question={yourQuestion}
        players={activePlayers}
        answeredPlayerIds={roomState?.game?.answeredPlayerIds ?? []}
        currentPlayerId={currentPlayerId}
        errorMessage={errorMessage}
        onSubmit={submitAnswer}
        chatEnabled={chatEnabled}
        hostId={roomState?.hostId ?? null}
        unreadChatCount={roomState?.game?.unreadChatCount ?? 0}
        onOpenChat={openChat}
        onLeave={exitRoom}
      />
    )
  }

  if (phase === 'answersReady') {
    return (
      <AnswersReadyScreen
        isHost={Boolean(isCurrentPlayerHost)}
        activePlayers={activePlayers}
        answers={roomState?.game?.answers ?? []}
        answersVisible={Boolean(roomState?.game?.answersVisible)}
        normalQuestion={roomState?.game?.normalQuestion ?? null}
        onShowAnswers={showAnswers}
        onShowResults={showResults}
        onLeave={exitRoom}
      />
    )
  }

  if (phase === 'showResults') {
    return (
      <ResultsScreen
        results={roomState?.game?.results ?? []}
        isHost={Boolean(isCurrentPlayerHost)}
        onNewGame={startNewGame}
        onLeave={exitRoom}
      />
    )
  }

  return (
    <main className="page-container">
      <section className="home-card" aria-labelledby="lobby-title">
        <header className="screen-header">
          <p className="eyebrow">Stanza pronta</p>
          <h1 id="lobby-title">Lobby</h1>
        </header>
        <div className="room-code-card" aria-label={`Codice stanza ${roomId}`}>
          <span className="room-code-label">Codice stanza</span>
          <strong className="room-code">{roomId}</strong>
        </div>
        <p className="room-mode">Modalità: <strong>{roomState?.mode === 'classic' ? 'Classico' : 'Manuale'}</strong></p>
        {roomState?.mode === 'classic' && roomState.classicCategories && (
          <p className="room-categories">
            Categorie: <strong>{roomState.classicCategories.map(formatCategory).join(', ')}</strong>
          </p>
        )}
        {connectionStatus !== 'connected' && <p className="connection-status">Connessione: {connectionStatus}</p>}
        <p className="host-message">
          {isCurrentPlayerHost
            ? 'Sei l’host: quando siete pronti puoi iniziare.'
            : phase === 'setup'
              ? 'L’host sta preparando la partita...'
              : 'In attesa che l’host inizi la partita.'}
        </p>

        {phase === 'lobby' && isCurrentPlayerHost && (
          <button type="button" className="start-game-button" onClick={startGame}>Inizia partita</button>
        )}

        {phase === 'setup' && (
          isCurrentPlayerHost ? (
            <GameSetupScreen
              activePlayers={activePlayers}
              errorMessage={errorMessage}
              onSubmit={submitGameSetup}
            />
          ) : null
        )}

        {phase !== 'setup' && errorMessage && <p className="error-message">{errorMessage}</p>}

        <section className="lobby-section" aria-labelledby="players-title">
          <h2 id="players-title">Giocatori ({players.length})</h2>
          <div className="player-list">
          {players.map((player) => (
            <PlayerCard key={player.id} name={player.name} isHost={player.id === roomState?.hostId} />
          ))}
          </div>
        </section>
        <LeaveRoomButton onLeave={exitRoom} />
      </section>
    </main>
  )
}

function formatCategory(category: QuestionCategory) {
  return category.charAt(0).toUpperCase() + category.slice(1)
}
