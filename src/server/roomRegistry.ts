import type * as Party from 'partykit/server'

import type { RoomPhase } from '../shared/types'

type RegisteredRoom = {
  phase: RoomPhase
}

const ROOM_CODE_PATTERN = /^[A-Z1-9]{4}$/
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

export default class RoomRegistry implements Party.Server {
  constructor(readonly room: Party.Room) {}

  async onRequest(request: Party.Request) {
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
      const existingRoom = await this.room.storage.get<RegisteredRoom>(roomId)

      if (existingRoom) {
        return this.respond({ message: 'Il codice stanza è già in uso.' }, 409)
      }

      await this.room.storage.put(roomId, { phase: 'lobby' } satisfies RegisteredRoom)
      return this.respond({ roomId, phase: 'lobby' }, 201)
    }

    if (request.method === 'GET') {
      const registeredRoom = await this.room.storage.get<RegisteredRoom>(roomId)

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
      const registeredRoom = await this.room.storage.get<RegisteredRoom>(roomId)

      if (!registeredRoom || !this.isRoomPhase(phase)) {
        return this.respond({ message: 'Stanza non disponibile.' }, 404)
      }

      await this.room.storage.put(roomId, { phase })
      return this.respond({ roomId, phase })
    }

    if (request.method === 'DELETE') {
      await this.room.storage.delete(roomId)
      return this.respond({ roomId })
    }

    return this.respond({ message: 'Metodo non supportato.' }, 405)
  }

  private getRoomId(request: Party.Request) {
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
