import { HomeScreen } from './client/screens/HomeScreen'
import { LobbyScreen } from './client/screens/LobbyScreen'
import { GameModeScreen } from './client/screens/GameModeScreen'
import { useState } from 'react'

import { generateRoomCode } from './client/roomCodes'
import { readActiveRoomId } from './client/realtime/roomSessionStorage'
import type { GameMode, QuestionCategory } from './shared/types'

type LobbyEntry = {
  playerName: string
  roomId: string
  entryMode: 'create' | 'join'
  mode?: GameMode
  classicCategories?: QuestionCategory[]
}

function getInitialLobby(): LobbyEntry | null {
  const roomId = readActiveRoomId()

  return roomId ? { playerName: '', roomId, entryMode: 'join' } : null
}

function App() {
  const [lobby, setLobby] = useState<LobbyEntry | null>(getInitialLobby)
  const [homeError, setHomeError] = useState<string | null>(null)
  const [homePlayerName, setHomePlayerName] = useState('')
  const [modeSelectionPlayerName, setModeSelectionPlayerName] = useState<string | null>(null)

  function handleCreateRoom(playerName: string) {
    setHomeError(null)
    setHomePlayerName(playerName)
    console.log('[room] create room clicked')
    setModeSelectionPlayerName(playerName)
  }

  function handleSelectMode(mode: GameMode, classicCategories?: QuestionCategory[]) {
    if (!modeSelectionPlayerName) {
      return
    }

    const playerName = modeSelectionPlayerName
    setModeSelectionPlayerName(null)
    setLobby({ playerName, roomId: generateRoomCode(), entryMode: 'create', mode, classicCategories })
  }

  function handleJoinRoom(playerName: string, roomId: string) {
    const normalizedRoomId = roomId.trim().toUpperCase()

    if (!/^[A-Z1-9]{4}$/.test(normalizedRoomId)) {
      setHomeError('Il codice stanza deve avere 4 caratteri: lettere A-Z o numeri 1-9.')
      return
    }

    setHomeError(null)
    setHomePlayerName(playerName)
    setLobby({ playerName, roomId: normalizedRoomId, entryMode: 'join' })
  }

  if (lobby) {
    return (
      <LobbyScreen
        playerName={lobby.playerName}
        roomId={lobby.roomId}
        entryMode={lobby.entryMode}
        mode={lobby.mode}
        classicCategories={lobby.classicCategories}
        onLeave={() => setLobby(null)}
        onJoinFailed={(message) => {
          setHomePlayerName(lobby.playerName)
          setLobby(null)
          setHomeError(message)
        }}
        onRoomClosed={(message) => {
          setHomePlayerName(lobby.playerName)
          setLobby(null)
          setHomeError(message)
        }}
      />
    )
  }

  if (modeSelectionPlayerName) {
    return (
      <GameModeScreen
        onBack={() => setModeSelectionPlayerName(null)}
        onSelectMode={handleSelectMode}
      />
    )
  }

  return (
    <HomeScreen
      errorMessage={homeError}
      initialPlayerName={homePlayerName}
      onCreateRoom={handleCreateRoom}
      onJoinRoom={handleJoinRoom}
    />
  )
}

export default App
