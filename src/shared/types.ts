export type Player = {
  id: string
  name: string
}

export type RoomPhase = 'lobby' | 'setup' | 'answering' | 'answersReady' | 'showResults'

export type GamePhase = RoomPhase

export type GameMode = 'manual' | 'classic'

export const QUESTION_CATEGORIES = ['testuali', 'numeriche', 'extra'] as const

export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number]

export const DEFAULT_CLASSIC_CATEGORIES: readonly QuestionCategory[] = ['testuali', 'numeriche']

export function isQuestionCategory(value: unknown): value is QuestionCategory {
  return typeof value === 'string' && QUESTION_CATEGORIES.some((category) => category === value)
}

export type PlayerAnswer = {
  playerId: string
  playerName: string
  answer: string
}

export type RoundResult = PlayerAnswer & {
  question: string
  isImpostor: boolean
}

export type ChatMessage = {
  id: string
  fromPlayerId: string
  toPlayerId: string
  text: string
  createdAt: number
}

export type RoomState = {
  roomId: string
  mode: GameMode
  classicCategories?: QuestionCategory[] | null
  players: Player[]
  hostId: string | null
  phase: RoomPhase
  game: {
    answeredPlayerIds: string[]
    allPlayersAnswered: boolean
    answersVisible: boolean
    normalQuestion: string | null
    answers: PlayerAnswer[] | null
    results: RoundResult[] | null
    chatMessages: ChatMessage[]
    unreadChatCount: number
    unreadChatsByPlayerId: Record<string, number>
  } | null
}

export type ClientMessage =
  | {
      type: 'createRoom'
      name: string
      mode: GameMode
      classicCategories?: QuestionCategory[]
    }
  | { type: 'joinRoom'; name: string }
  | { type: 'resumeRoom'; resumeToken: string }
  | { type: 'startGame' }
  | {
      type: 'submitGameSetup'
      impostorPlayerId: string
      normalQuestion: string
      impostorQuestion: string
    }
  | { type: 'submitAnswer'; answer: string }
  | { type: 'confirmAnswers' }
  | { type: 'showAnswers' }
  | { type: 'showResults' }
  | { type: 'startNewGame' }
  | { type: 'leaveRoom' }
  | { type: 'sendChatMessage'; toPlayerId: string; text: string }
  | { type: 'markChatAsRead'; withPlayerId: string }

export type ServerMessage =
  | { type: 'connected'; playerId: string; roomId: string }
  | { type: 'sessionCredentials'; playerId: string; roomId: string; resumeToken: string }
  | { type: 'roomCreated'; playerId: string; roomId: string; state: RoomState }
  | { type: 'roomState'; state: RoomState }
  | { type: 'roomClosed'; message: string }
  | { type: 'yourQuestion'; question: string }
  | { type: 'error'; message: string; code?: 'INVALID_RESUME_TOKEN' }
