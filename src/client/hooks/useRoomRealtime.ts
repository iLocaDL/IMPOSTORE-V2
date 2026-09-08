import { useEffect, useRef, useState } from 'react'

import type {
  ClientMessage,
  GameMode,
  QuestionCategory,
  RoomState,
  ServerMessage,
} from '../../shared/types'
import { clearRoomSession, readResumeToken, saveRoomSession } from '../realtime/roomSessionStorage'

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
const RECONNECT_DELAY_MS = 1_000

export function useRoomRealtime(
  roomId: string,
  playerName: string,
  entryMode: 'create' | 'join',
  mode: GameMode | undefined,
  onRoomClosed: (message: string) => void,
  transport?: RoomRealtimeTransport,
) {
  const connectionRef = useRef<RoomRealtimeConnection | null>(null)
  const roomClosedRef = useRef(false)
  const intentionalCloseRef = useRef(false)
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
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
    roomClosedRef.current = false
    intentionalCloseRef.current = false

    const connect = () => {
      if (!isActive) {
        return
      }

      setConnectionStatus('connecting')
      const currentConnection = transport.connect(roomId, {
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
            intentionalCloseRef.current = true
            clearRoomSession(roomId)
            setRoomState(null)
            setCurrentPlayerId(null)
            setYourQuestion(null)
            setErrorMessage(null)
            currentConnection.close()
            onRoomClosedRef.current(serverMessage.message)
            return
          }

          if (roomClosedRef.current) {
            return
          }

          if (serverMessage.type === 'connected') {
            const resumeToken = readResumeToken(roomId)
            const initialMessage: ClientMessage = resumeToken
              ? { type: 'resumeRoom', resumeToken }
              : entryMode === 'create'
                ? {
                    type: 'createRoom',
                    name: playerName,
                    mode: mode ?? 'manual',
                  }
                : { type: 'joinRoom', name: playerName }
            currentConnection.send(initialMessage)
          }

          if (serverMessage.type === 'sessionCredentials') {
            setCurrentPlayerId(serverMessage.playerId)
            saveRoomSession(serverMessage.roomId, serverMessage.resumeToken)
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
            if (serverMessage.code === 'INVALID_RESUME_TOKEN') {
              clearRoomSession(roomId)
              intentionalCloseRef.current = true
              currentConnection.close()
            }

            setErrorMessage(serverMessage.message)
          }
        },
        onError: () => {
          if (isActive) {
            setConnectionStatus('error')
          }
        },
        onClose: () => {
          if (connectionRef.current === currentConnection) {
            connectionRef.current = null
          }

          if (!isActive || roomClosedRef.current || intentionalCloseRef.current) {
            if (isActive) {
              setConnectionStatus('closed')
            }
            return
          }

          setConnectionStatus('connecting')
          reconnectTimeout = setTimeout(connect, RECONNECT_DELAY_MS)
        },
      })
      connectionRef.current = currentConnection
    }

    connect()

    return () => {
      isActive = false
      intentionalCloseRef.current = true

      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }

      connectionRef.current?.close()
      connectionRef.current = null
    }
  }, [entryMode, mode, playerName, roomId, transport])

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
    updateClassicCategories: (categories: QuestionCategory[]) =>
      sendMessage({ type: 'updateClassicCategories', categories }),
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
      intentionalCloseRef.current = true
      clearRoomSession(roomId)
      sendMessage({ type: 'leaveRoom' })
      connectionRef.current?.close()
    },
  }
}
