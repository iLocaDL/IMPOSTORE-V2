import { HomeScreen } from './client/screens/HomeScreen'
import { LobbyScreen } from './client/screens/LobbyScreen'
import { useState } from 'react'

import { generateRoomCode } from './client/roomCodes'

function App() {
  const [lobby, setLobby] = useState<{ playerName: string; roomId: string; entryMode: 'create' | 'join' } | null>(null)
  const [homeError, setHomeError] = useState<string | null>(null)
  const [homePlayerName, setHomePlayerName] = useState('')

  function handleCreateRoom(playerName: string) {
    setHomeError(null)
    setHomePlayerName(playerName)
    console.log('[room] create room clicked')
    setLobby({ playerName, roomId: generateRoomCode(), entryMode: 'create' })
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
