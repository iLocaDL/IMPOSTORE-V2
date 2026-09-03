import { useEffect, useRef, useState } from 'react'

import type { ClientMessage, RoomState, ServerMessage } from '../../shared/types'

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'closed' | 'error'

export type RoomRealtimeConnection = {
  send: (message: ClientMessage) => void
  close: () => void
}

export type RoomRealtimeHandlers = {
  onOpen: () => void
  onMessage: (message: ServerMessage) => void
  onError: () => void
  onClose: () => void
}

export type RoomRealtimeTransport = {
  connect: (roomId: string, handlers: RoomRealtimeHandlers) => RoomRealtimeConnection
}

const REALTIME_NOT_CONFIGURED = 'Il servizio realtime non è ancora configurato.'

export function useRoomRealtime(
  roomId: string,
  playerName: string,
  entryMode: 'create' | 'join',
  onRoomClosed: (message: string) => void,
  transport?: RoomRealtimeTransport,
) {
  const connectionRef = useRef<RoomRealtimeConnection | null>(null)
  const roomClosedRef = useRef(false)
  const onRoomClosedRef = useRef(onRoomClosed)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(transport ? 'connecting' : 'idle')
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [yourQuestion, setYourQuestion] = useState<string | null>(null)

  useEffect(() => {
    onRoomClosedRef.current = onRoomClosed
  }, [onRoomClosed])

  useEffect(() => {
    if (!transport) {
      return
    }

    let isActive = true
    let connection: RoomRealtimeConnection | null = null
    roomClosedRef.current = false

    connection = transport.connect(roomId, {
      onOpen: () => {
        if (isActive) {
          setConnectionStatus('connected')
        }
      },
      onMessage: (serverMessage) => {
        if (!isActive) {
          return
        }

        if (serverMessage.type === 'roomClosed') {
          roomClosedRef.current = true
          setRoomState(null)
          setCurrentPlayerId(null)
          setYourQuestion(null)
          setErrorMessage(null)
          connection?.close()
          onRoomClosedRef.current(serverMessage.message)
          return
        }

        if (roomClosedRef.current) {
          return
        }

        if (serverMessage.type === 'connected') {
          setCurrentPlayerId(serverMessage.playerId)
          const initialMessage: ClientMessage = entryMode === 'create'
            ? { type: 'createRoom', name: playerName }
            : { type: 'joinRoom', name: playerName }
          connection?.send(initialMessage)
        }

        if (serverMessage.type === 'roomCreated') {
          setCurrentPlayerId(serverMessage.playerId)
          setRoomState(serverMessage.state)
          setErrorMessage(null)
        }

        if (serverMessage.type === 'roomState') {
          setRoomState(serverMessage.state)
          setErrorMessage(null)

          if (serverMessage.state.phase !== 'answering') {
            setYourQuestion(null)
          }
        }

        if (serverMessage.type === 'yourQuestion') {
          setYourQuestion(serverMessage.question)
        }

        if (serverMessage.type === 'error') {
          setErrorMessage(serverMessage.message)
        }
      },
      onError: () => {
        if (isActive) {
          setConnectionStatus('error')
        }
      },
      onClose: () => {
        if (isActive) {
          setConnectionStatus('closed')
        }
      },
    })
    connectionRef.current = connection

    return () => {
      isActive = false
      connection?.close()

      if (connectionRef.current === connection) {
        connectionRef.current = null
      }
    }
  }, [entryMode, playerName, roomId, transport])

  const sendMessage = (message: ClientMessage) => {
    connectionRef.current?.send(message)
  }

  const isCurrentPlayerHost = roomState?.hostId === currentPlayerId

  return {
    connectionStatus,
    roomState,
    currentPlayerId,
    isCurrentPlayerHost,
    errorMessage: transport ? errorMessage : REALTIME_NOT_CONFIGURED,
    yourQuestion,
    startGame: () => sendMessage({ type: 'startGame' }),
    submitGameSetup: (impostorPlayerId: string, normalQuestion: string, impostorQuestion: string) =>
      sendMessage({ type: 'submitGameSetup', impostorPlayerId, normalQuestion, impostorQuestion }),
    submitAnswer: (answer: string) => sendMessage({ type: 'submitAnswer', answer }),
    confirmAnswers: () => sendMessage({ type: 'confirmAnswers' }),
    showAnswers: () => sendMessage({ type: 'showAnswers' }),
    showResults: () => sendMessage({ type: 'showResults' }),
    startNewGame: () => sendMessage({ type: 'startNewGame' }),
    sendChatMessage: (toPlayerId: string, text: string) =>
      sendMessage({ type: 'sendChatMessage', toPlayerId, text }),
    markChatAsRead: (withPlayerId: string) => sendMessage({ type: 'markChatAsRead', withPlayerId }),
    leaveRoom: () => {
      sendMessage({ type: 'leaveRoom' })
      connectionRef.current?.close()
    },
  }
}
