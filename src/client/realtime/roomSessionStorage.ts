const ACTIVE_ROOM_KEY = 'impostore:active-room'
const RESUME_TOKEN_PREFIX = 'impostore:resume:'

function normalizeRoomId(roomId: string) {
  return roomId.trim().toUpperCase()
}

function getResumeStorageKey(roomId: string) {
  return `${RESUME_TOKEN_PREFIX}${normalizeRoomId(roomId)}`
}

export function readActiveRoomId() {
  try {
    const roomId = sessionStorage.getItem(ACTIVE_ROOM_KEY)
    return roomId && /^[A-Z1-9]{4}$/.test(roomId) ? roomId : null
  } catch {
    return null
  }
}

export function readResumeToken(roomId: string) {
  try {
    return sessionStorage.getItem(getResumeStorageKey(roomId))
  } catch {
    return null
  }
}

export function saveRoomSession(roomId: string, resumeToken: string) {
  try {
    const normalizedRoomId = normalizeRoomId(roomId)
    sessionStorage.setItem(getResumeStorageKey(normalizedRoomId), resumeToken)
    sessionStorage.setItem(ACTIVE_ROOM_KEY, normalizedRoomId)
  } catch {
    // La sessione resta utilizzabile finché la pagina rimane aperta.
  }
}

export function clearRoomSession(roomId: string) {
  try {
    const normalizedRoomId = normalizeRoomId(roomId)
    sessionStorage.removeItem(getResumeStorageKey(normalizedRoomId))

    if (sessionStorage.getItem(ACTIVE_ROOM_KEY) === normalizedRoomId) {
      sessionStorage.removeItem(ACTIVE_ROOM_KEY)
    }
  } catch {
    // Nessuna operazione alternativa necessaria.
  }
}
