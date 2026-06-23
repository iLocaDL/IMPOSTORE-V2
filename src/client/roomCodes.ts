const ROOM_CODE_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789'

export function generateRoomCode(): string {
  const randomValues = crypto.getRandomValues(new Uint32Array(4))

  return Array.from(
    randomValues,
    (value) => ROOM_CODE_CHARACTERS[value % ROOM_CODE_CHARACTERS.length],
  ).join('')
}
