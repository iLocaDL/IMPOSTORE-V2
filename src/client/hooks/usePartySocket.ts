import { useEffect, useRef, useState } from 'react'
import PartySocket from 'partysocket'

import type { ClientMessage, RoomState, ServerMessage } from '../../shared/types'

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'closed' | 'error'

export function usePartySocket(
  roomId: string,
  playerName: string,
  entryMode: 'create' | 'join',
  onRoomClosed: (message: string) => void,
) {
  const socketRef = useRef<PartySocket | null>(null)
  const roomClosedRef = useRef(false)
  const onRoomClosedRef = useRef(onRoomClosed)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [yourQuestion, setYourQuestion] = useState<string | null>(null)

  useEffect(() => {
    onRoomClosedRef.current = onRoomClosed
  }, [onRoomClosed])

  useEffect(() => {
    let isActive = true
    roomClosedRef.current = false
    console.log('[room] connecting to room', roomId)
    const socket = new PartySocket({ host: 'localhost:1999', room: roomId })
    socketRef.current = socket

    socket.addEventListener('open', () => {
      if (isActive) {
        setConnectionStatus('connected')
      }
    })

    socket.addEventListener('message', (event) => {
      try {
        const serverMessage = JSON.parse(String(event.data)) as ServerMessage
        console.log('[room] received message', serverMessage)

        if (!isActive) {
          return
        }

        if (serverMessage.type === 'roomClosed') {
          roomClosedRef.current = true
          setRoomState(null)
          setCurrentPlayerId(null)
          setYourQuestion(null)
          setErrorMessage(null)
          socket.close()
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
          console.log(`[room] sending ${initialMessage.type}`)
          socket.send(JSON.stringify(initialMessage))
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
      } catch {
        setConnectionStatus('error')
        setErrorMessage('Messaggio ricevuto non valido.')
      }
    })

    socket.addEventListener('error', () => {
      if (isActive) {
        setConnectionStatus('error')
      }
    })

    socket.addEventListener('close', () => {
      if (isActive) {
        setConnectionStatus('closed')
      }
    })

    return () => {
      isActive = false
      socket.close()

      if (socketRef.current === socket) {
        socketRef.current = null
      }
    }
  }, [entryMode, roomId, playerName])

  const sendMessage = (message: ClientMessage) => {
    const socket = socketRef.current

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message))
    }
  }

  const isCurrentPlayerHost = roomState?.hostId === currentPlayerId

  return {
    connectionStatus,
    roomState,
    currentPlayerId,
    isCurrentPlayerHost,
    errorMessage,
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
      socketRef.current?.close()
    },
  }
}
