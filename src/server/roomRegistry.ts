import type { RoomPhase } from '../shared/types'

export type RegisteredRoom = {
  phase: RoomPhase
}

export type RoomRegistryStorage = {
  get: (roomId: string) => Promise<RegisteredRoom | undefined>
  put: (roomId: string, room: RegisteredRoom) => Promise<void>
  delete: (roomId: string) => Promise<void>
}

const ROOM_CODE_PATTERN = /^[A-Z1-9]{4}$/
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

export default class RoomRegistry {
  constructor(readonly storage: RoomRegistryStorage) {}

  async handleRequest(request: Request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          ...CORS_HEADERS,
          'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE',
        },
      })
    }

    const roomId = this.getRoomId(request)

    if (!roomId) {
      return this.respond({ message: 'Codice stanza non valido.' }, 400)
    }

    if (request.method === 'POST') {
      const existingRoom = await this.storage.get(roomId)

      if (existingRoom) {
        return this.respond({ message: 'Il codice stanza è già in uso.' }, 409)
      }

      await this.storage.put(roomId, { phase: 'lobby' })
      return this.respond({ roomId, phase: 'lobby' }, 201)
    }

    if (request.method === 'GET') {
      const registeredRoom = await this.storage.get(roomId)

      if (!registeredRoom) {
        return this.respond({ message: 'La stanza non esiste.' }, 404)
      }

      if (registeredRoom.phase !== 'lobby') {
        return this.respond({ message: 'La partita è già iniziata.' }, 409)
      }

      return this.respond({ roomId, phase: registeredRoom.phase })
    }

    if (request.method === 'PATCH') {
      const phase = new URL(request.url).searchParams.get('phase')
      const registeredRoom = await this.storage.get(roomId)

      if (!registeredRoom || !this.isRoomPhase(phase)) {
        return this.respond({ message: 'Stanza non disponibile.' }, 404)
      }

      await this.storage.put(roomId, { phase })
      return this.respond({ roomId, phase })
    }

    if (request.method === 'DELETE') {
      await this.storage.delete(roomId)
      return this.respond({ roomId })
    }

    return this.respond({ message: 'Metodo non supportato.' }, 405)
  }

  private getRoomId(request: Request) {
    const roomId = new URL(request.url).pathname.split('/').at(-1)?.toUpperCase()
    return roomId && ROOM_CODE_PATTERN.test(roomId) ? roomId : null
  }

  private respond(body: Record<string, string>, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS })
  }

  private isRoomPhase(phase: string | null): phase is RoomPhase {
    return phase === 'lobby' || phase === 'setup' || phase === 'answering' || phase === 'answersReady' || phase === 'showResults'
  }
}
