import { generateRoomCode } from '../roomCodes'

export type RoomRegistryMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'
export type RoomRegistryRequest = (roomId: string, method?: RoomRegistryMethod) => Promise<void>

export class RoomRegistryError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

export async function createRoom(requestRoom: RoomRegistryRequest): Promise<string> {
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

export async function validateRoomJoin(roomId: string, requestRoom: RoomRegistryRequest) {
  try {
    await requestRoom(roomId)
  } catch (error) {
    if (error instanceof RoomRegistryError) {
      throw error
    }

    throw new Error('Impossibile verificare la stanza.', { cause: error })
  }
}
