import type { ServerMessage } from '../../shared/types'
import type {
  RoomRealtimeConnection,
  RoomRealtimeHandlers,
  RoomRealtimeTransport,
} from '../hooks/useRoomRealtime'

const DEFAULT_WORKER_URL = 'ws://localhost:8787'

function getWorkerWebSocketUrl() {
  const configuredUrl = import.meta.env.VITE_WORKER_URL ?? DEFAULT_WORKER_URL

  return configuredUrl
    .replace(/^http:/, 'ws:')
    .replace(/^https:/, 'wss:')
    .replace(/\/$/, '')
}

export const cloudflareRealtimeTransport: RoomRealtimeTransport = {
  connect(roomId: string, handlers: RoomRealtimeHandlers): RoomRealtimeConnection {
    const normalizedRoomId = roomId.trim().toUpperCase()
    const socket = new WebSocket(`${getWorkerWebSocketUrl()}/room/${encodeURIComponent(normalizedRoomId)}`)

    socket.addEventListener('open', () => {
      handlers.onOpen()
    })

    socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(String(event.data)) as ServerMessage
        handlers.onMessage(message)
      } catch {
        handlers.onError()
      }
    })

    socket.addEventListener('error', () => {
      handlers.onError()
    })

    socket.addEventListener('close', () => {
      handlers.onClose()
    })

    return {
      send(message) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(message))
        }
      },
      close() {
        if (socket.readyState === WebSocket.CONNECTING) {
          socket.addEventListener('open', () => socket.close(), { once: true })
          return
        }

        if (socket.readyState === WebSocket.OPEN) {
          socket.close()
        }
      },
    }
  },
}
