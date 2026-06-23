import PartySocket from 'partysocket'

import { generateRoomCode } from '../roomCodes'

const PARTYKIT_HOST = 'localhost:1999'
const REGISTRY_PARTY = 'roomregistry'
const REGISTRY_ROOM = 'rooms'

type RoomRegistryErrorPayload = {
  message?: string
}

class RoomRegistryError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

async function requestRoom(roomId: string, method = 'GET') {
  const response = await PartySocket.fetch(
    {
      host: PARTYKIT_HOST,
      party: REGISTRY_PARTY,
      room: REGISTRY_ROOM,
      path: `rooms/${roomId}`,
    },
    { method },
  )

  if (response.ok) {
    return
  }

  const payload = await response.json().catch(() => null) as RoomRegistryErrorPayload | null
  throw new RoomRegistryError(payload?.message ?? 'Operazione sulla stanza non riuscita.', response.status)
}

export async function createRoom(): Promise<string> {
  while (true) {
    const roomId = generateRoomCode()

    try {
      await requestRoom(roomId, 'POST')
      return roomId
    } catch (error) {
      if (error instanceof RoomRegistryError && error.status === 409) {
        continue
      }

      throw new Error('Impossibile creare la stanza.', { cause: error })
    }
  }
}

export async function validateRoomJoin(roomId: string) {
  try {
    await requestRoom(roomId)
  } catch (error) {
    if (error instanceof RoomRegistryError) {
      throw error
    }

    throw new Error('Impossibile verificare la stanza.', { cause: error })
  }
}
