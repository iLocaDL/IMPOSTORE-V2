import type * as Party from 'partykit/server'

import type {
  ChatMessage,
  ClientMessage,
  Player,
  PlayerAnswer,
  RoomPhase,
  RoomState,
  RoundResult,
  ServerMessage,
} from '../shared/types'

type InternalGameConfig = {
  impostorPlayerId: string
  normalQuestion: string
  impostorQuestion: string
}

type PlayerAssignment = {
  playerId: string
  question: string
  isImpostor: boolean
}

type InternalGameState = {
  config: InternalGameConfig | null
  answersVisible: boolean
  assignments: PlayerAssignment[]
  answers: PlayerAnswer[]
  chats: ChatMessage[]
  unreadByUser: Map<string, Map<string, number>>
}

export default class Server implements Party.Server {
  private players: Player[] = []
  private hostId: string | null = null
  private phase: RoomPhase = 'lobby'
  private game: InternalGameState | null = null
  private initialized = false
  private connections = new Map<string, Party.Connection>()

  constructor(readonly room: Party.Room) {}

  onConnect(connection: Party.Connection) {
    this.connections.set(connection.id, connection)
    console.log('[room] connection opened', this.room.id, connection.id)
    connection.send(
      JSON.stringify({ type: 'connected', playerId: connection.id, roomId: this.room.id } satisfies ServerMessage),
    )
  }

  async onMessage(message: string | ArrayBuffer | ArrayBufferView, sender: Party.Connection) {
    if (typeof message !== 'string') {
      this.sendError(sender, 'Il messaggio deve essere una stringa JSON.')
      return
    }

    let clientMessage: ClientMessage

    try {
      clientMessage = JSON.parse(message) as ClientMessage
    } catch {
      this.sendError(sender, 'JSON non valido.')
      return
    }

    switch (clientMessage.type) {
      case 'createRoom':
        console.log('[room] received createRoom', this.room.id, sender.id)
        this.createRoom(sender, clientMessage.name)
        return
      case 'joinRoom':
        this.joinRoom(sender, clientMessage.name)
        return
      case 'startGame':
        this.startSetup(sender)
        return
      case 'submitGameSetup':
        this.submitGameSetup(sender, clientMessage)
        return
      case 'submitAnswer':
        this.submitAnswer(sender, clientMessage.answer)
        return
      case 'confirmAnswers':
        this.confirmAnswers(sender)
        return
      case 'showAnswers':
        this.showAnswers(sender)
        return
      case 'showResults':
        this.showResults(sender)
        return
      case 'startNewGame':
        this.startNewGame(sender)
        return
      case 'leaveRoom':
        this.removePlayer(sender.id)
        return
      case 'sendChatMessage':
        this.sendChatMessage(sender, clientMessage.toPlayerId, clientMessage.text)
        return
      case 'markChatAsRead':
        this.markChatAsRead(sender, clientMessage.withPlayerId)
        return
    }
  }

  onClose(connection: Party.Connection) {
    this.connections.delete(connection.id)
    this.removePlayer(connection.id)
  }

  private createRoom(connection: Party.Connection, name: string) {
    if (!name.trim()) {
      this.sendError(connection, 'Nome non valido.')
      return
    }

    if (this.initialized) {
      this.sendError(connection, 'La stanza esiste già.')
      return
    }

    this.initialized = true
    this.phase = 'lobby'
    this.game = null
    this.players = [{ id: connection.id, name: name.trim() }]
    this.hostId = connection.id

    const state = this.getPublicStateForConnection(connection.id)
    connection.send(
      JSON.stringify({ type: 'roomCreated', playerId: connection.id, roomId: this.room.id, state } satisfies ServerMessage),
    )
    console.log('[room] initialized and sent roomCreated', this.room.id)
    this.broadcastRoomState()
  }

  private joinRoom(connection: Party.Connection, name: string) {
    if (!name.trim()) {
      this.sendError(connection, 'Nome non valido.')
      return
    }

    if (!this.initialized) {
      this.sendError(connection, 'La stanza non esiste.')
      return
    }

    if (this.phase !== 'lobby') {
      this.sendError(connection, 'La partita è già iniziata.')
      return
    }

    const existingPlayer = this.players.find((player) => player.id === connection.id)

    if (existingPlayer) {
      existingPlayer.name = name.trim()
    } else {
      this.players.push({ id: connection.id, name: name.trim() })
    }

    this.broadcastRoomState()
  }

  private removePlayer(playerId: string) {
    const playerIndex = this.players.findIndex((player) => player.id === playerId)

    if (playerIndex === -1) {
      return
    }

    if (playerId === this.hostId) {
      this.closeRoom(playerId)
      return
    }

    this.players.splice(playerIndex, 1)

    if (this.game) {
      this.game.answers = this.game.answers.filter(
        (answer) => answer.playerId !== playerId && answer.playerId !== this.hostId,
      )
      this.game.chats = this.game.chats.filter(
        (message) => message.fromPlayerId !== playerId && message.toPlayerId !== playerId,
      )
      this.game.unreadByUser.delete(playerId)
      this.game.unreadByUser.forEach((counts) => counts.delete(playerId))
    }

    if (this.players.length === 0) {
      this.resetRoom()
      return
    }

    this.broadcastRoomState()
  }

  private closeRoom(leavingHostId: string) {
    const message = 'L’host ha abbandonato la stanza. La partita è stata interrotta.'

    for (const [connectionId, connection] of this.connections) {
      if (connectionId !== leavingHostId) {
        connection.send(JSON.stringify({ type: 'roomClosed', message } satisfies ServerMessage))
      }
    }

    this.resetRoom()
  }

  private resetRoom() {
    this.initialized = false
    this.phase = 'lobby'
    this.game = null
    this.hostId = null
    this.players = []
  }

  private startSetup(sender: Party.Connection) {
    if (!this.isHost(sender)) {
      this.sendError(sender, 'Solo l host puo iniziare la partita.')
      return
    }

    if (this.activePlayers().length < 2) {
      this.sendError(sender, 'Servono almeno 2 giocatori oltre all host per iniziare.')
      return
    }

    if (this.phase !== 'lobby') {
      this.sendError(sender, 'La partita e gia iniziata.')
      return
    }

    this.phase = 'setup'
    this.game = this.createEmptyGame()
    this.broadcastRoomState()
  }

  private submitGameSetup(
    sender: Party.Connection,
    setup: Extract<ClientMessage, { type: 'submitGameSetup' }>,
  ) {
    if (!this.isHost(sender) || this.phase !== 'setup') {
      this.sendError(sender, 'Configurazione non consentita.')
      return
    }

    const activePlayers = this.activePlayers()

    if (activePlayers.length < 2) {
      this.sendError(sender, 'Servono almeno 2 giocatori attivi.')
      return
    }

    if (!activePlayers.some((player) => player.id === setup.impostorPlayerId)) {
      this.sendError(sender, 'Seleziona un impostore tra i giocatori attivi.')
      return
    }

    if (!setup.normalQuestion.trim() || !setup.impostorQuestion.trim()) {
      this.sendError(sender, 'Inserisci entrambe le domande.')
      return
    }

    const config: InternalGameConfig = {
      impostorPlayerId: setup.impostorPlayerId,
      normalQuestion: setup.normalQuestion.trim(),
      impostorQuestion: setup.impostorQuestion.trim(),
    }

    this.game = {
      ...this.createEmptyGame(),
      config,
      assignments: activePlayers.map((player) => ({
        playerId: player.id,
        question: player.id === config.impostorPlayerId ? config.impostorQuestion : config.normalQuestion,
        isImpostor: player.id === config.impostorPlayerId,
      })),
    }
    this.phase = 'answering'
    this.broadcastRoomState()
    this.sendPersonalQuestions()
  }

  private submitAnswer(sender: Party.Connection, answer: string) {
    if (this.phase !== 'answering' || !this.game) {
      this.sendError(sender, 'Le risposte non sono disponibili in questa fase.')
      return
    }

    const player = this.activePlayers().find((currentPlayer) => currentPlayer.id === sender.id)

    if (!player || !this.game.assignments.some((assignment) => assignment.playerId === sender.id)) {
      this.sendError(sender, 'Solo i giocatori attivi possono rispondere.')
      return
    }

    if (!answer.trim()) {
      this.sendError(sender, 'La risposta non puo essere vuota.')
      return
    }

    const playerAnswer: PlayerAnswer = { playerId: player.id, playerName: player.name, answer: answer.trim() }
    const existingAnswerIndex = this.game.answers.findIndex((currentAnswer) => currentAnswer.playerId === sender.id)

    if (existingAnswerIndex === -1) {
      this.game.answers.push(playerAnswer)
    } else {
      this.game.answers[existingAnswerIndex] = playerAnswer
    }

    this.broadcastRoomState()
  }

  private confirmAnswers(sender: Party.Connection) {
    if (!this.isHost(sender) || this.phase !== 'answering' || !this.game) {
      this.sendError(sender, 'Conferma non consentita.')
      return
    }

    if (!this.allPlayersAnswered()) {
      this.sendError(sender, 'Non tutti i giocatori hanno risposto.')
      return
    }

    this.game.answersVisible = false
    this.phase = 'answersReady'
    this.broadcastRoomState()
  }

  private showAnswers(sender: Party.Connection) {
    if (!this.isHost(sender) || this.phase !== 'answersReady' || !this.game) {
      this.sendError(sender, 'Mostra risposte non consentito.')
      return
    }

    this.game.answersVisible = true
    this.broadcastRoomState()
  }

  private showResults(sender: Party.Connection) {
    if (!this.isHost(sender) || this.phase !== 'answersReady' || !this.game?.answersVisible) {
      this.sendError(sender, 'Azione non consentita.')
      return
    }

    this.phase = 'showResults'
    this.broadcastRoomState()
  }

  private startNewGame(sender: Party.Connection) {
    if (!this.isHost(sender) || this.phase !== 'showResults') {
      this.sendError(sender, 'Nuova partita non consentita.')
      return
    }

    this.phase = 'setup'
    this.game = this.createEmptyGame()
    this.broadcastRoomState()
  }

  private sendChatMessage(sender: Party.Connection, toPlayerId: string, text: string) {
    if (!this.game || !this.canUseChat()) {
      this.sendError(sender, 'La chat non e disponibile in questa fase.')
      return
    }

    if (!text.trim() || !this.isValidChatRecipient(sender.id, toPlayerId)) {
      this.sendError(sender, 'Destinatario o messaggio non valido.')
      return
    }

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      fromPlayerId: sender.id,
      toPlayerId,
      text: text.trim(),
      createdAt: Date.now(),
    }
    this.game.chats.push(message)
    this.setUnread(toPlayerId, sender.id, this.getUnread(toPlayerId, sender.id) + 1)
    this.broadcastRoomState()
  }

  private markChatAsRead(sender: Party.Connection, withPlayerId: string) {
    if (!this.game || !this.canUseChat() || !this.isValidChatRecipient(sender.id, withPlayerId)) {
      this.sendError(sender, 'Chat non disponibile.')
      return
    }

    this.setUnread(sender.id, withPlayerId, 0)
    this.broadcastRoomState()
  }

  private activePlayers() {
    return this.players.filter((player) => player.id !== this.hostId)
  }

  private allPlayersAnswered() {
    return Boolean(
      this.game &&
        this.activePlayers().every((player) => this.game?.answers.some((answer) => answer.playerId === player.id)),
    )
  }

  private canUseChat() {
    return this.phase === 'answering'
  }

  private isHost(connection: Party.Connection) {
    return connection.id === this.hostId
  }

  private isValidChatRecipient(fromPlayerId: string, toPlayerId: string) {
    if (fromPlayerId === this.hostId) {
      return this.activePlayers().some((player) => player.id === toPlayerId)
    }

    return toPlayerId === this.hostId && this.activePlayers().some((player) => player.id === fromPlayerId)
  }

  private getPublicStateForConnection(connectionId: string): RoomState {
    const activePlayerIds = new Set(this.activePlayers().map((player) => player.id))
    const answers = this.game?.answers.filter((answer) => activePlayerIds.has(answer.playerId)) ?? []
    const isHost = connectionId === this.hostId
    const canSeeAnswers =
      (isHost && this.phase === 'answering') || (this.phase === 'answersReady' && Boolean(this.game?.answersVisible))
    const canSeeResults = this.phase === 'showResults'
    const chatIsAvailable = this.canUseChat()
    const visibleChats = chatIsAvailable
      ? this.game?.chats.filter(
          (message) => isHost || message.fromPlayerId === connectionId || message.toPlayerId === connectionId,
        ) ?? []
      : []
    const unreadChatsByPlayerId = isHost && chatIsAvailable
      ? Object.fromEntries(this.activePlayers().map((player) => [player.id, this.getUnread(connectionId, player.id)]))
      : {}

    return {
      roomId: this.room.id,
      players: this.players,
      hostId: this.hostId,
      phase: this.phase,
      game: this.game
        ? {
            answeredPlayerIds: answers.map((answer) => answer.playerId),
            allPlayersAnswered: this.allPlayersAnswered(),
            answersVisible: this.game.answersVisible,
            answers: canSeeAnswers ? answers : null,
            results: canSeeResults ? this.getRoundResults() : null,
            chatMessages: visibleChats,
            unreadChatCount: !chatIsAvailable || isHost || !this.hostId
              ? 0
              : this.getUnread(connectionId, this.hostId),
            unreadChatsByPlayerId,
          }
        : null,
    }
  }

  private getRoundResults(): RoundResult[] {
    if (!this.game) {
      return []
    }

    const activePlayerIds = new Set(this.activePlayers().map((player) => player.id))

    return this.game.answers
      .filter((answer) => activePlayerIds.has(answer.playerId))
      .flatMap((answer) => {
        const assignment = this.game?.assignments.find((item) => item.playerId === answer.playerId)
        return assignment ? [{ ...answer, question: assignment.question }] : []
      })
  }

  private broadcastRoomState() {
    for (const [connectionId, connection] of this.connections) {
      connection.send(
        JSON.stringify({ type: 'roomState', state: this.getPublicStateForConnection(connectionId) } satisfies ServerMessage),
      )
    }
  }

  private sendPersonalQuestions() {
    if (!this.game) {
      return
    }

    for (const assignment of this.game.assignments) {
      this.connections
        .get(assignment.playerId)
        ?.send(JSON.stringify({ type: 'yourQuestion', question: assignment.question } satisfies ServerMessage))
    }
  }

  private createEmptyGame(): InternalGameState {
    return { config: null, answersVisible: false, assignments: [], answers: [], chats: [], unreadByUser: new Map() }
  }

  private getUnread(userId: string, fromPlayerId: string) {
    return this.game?.unreadByUser.get(userId)?.get(fromPlayerId) ?? 0
  }

  private setUnread(userId: string, fromPlayerId: string, count: number) {
    if (!this.game) {
      return
    }

    const unreadForUser = this.game.unreadByUser.get(userId) ?? new Map<string, number>()
    unreadForUser.set(fromPlayerId, count)
    this.game.unreadByUser.set(userId, unreadForUser)
  }

  private sendError(connection: Party.Connection, message: string) {
    connection.send(JSON.stringify({ type: 'error', message } satisfies ServerMessage))
  }

}

Server satisfies Party.Worker
