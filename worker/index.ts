import { DurableObject } from "cloudflare:workers";

import type {
  ChatMessage,
  ClientMessage,
  Player,
  PlayerAnswer,
  RoomPhase,
  RoomState,
  RoundResult,
  ServerMessage,
} from "../src/shared/types";

interface Env {
  ROOMS: DurableObjectNamespace<GameRoom>;
}

type ConnectionAttachment = {
  connectionId: string;
  playerId: string;
  roomId: string;
  joined: boolean;
};

type PersistedGameConfig = {
  impostorPlayerId: string;
  normalQuestion: string;
  impostorQuestion: string;
};

type PersistedPlayerAssignment = {
  playerId: string;
  question: string;
  isImpostor: boolean;
};

type PersistedGameState = {
  config: PersistedGameConfig | null;
  answersVisible: boolean;
  assignments: PersistedPlayerAssignment[];
  answers: PlayerAnswer[];
  chats: ChatMessage[];
  unreadByUser: Record<string, Record<string, number>>;
};

type PersistedRoomState = {
  roomId: string;
  players: Player[];
  hostId: string | null;
  phase: RoomPhase;
  game: PersistedGameState | null;
};

const ROOM_STATE_KEY = "roomState";
const ROOM_CODE_PATTERN = /^[A-Z1-9]{4}$/;

export class GameRoom extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", {
        status: 426,
      });
    }

    const roomId = this.getRoomId(request);

    if (!roomId) {
      return new Response("Invalid room code", { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    const attachment: ConnectionAttachment = {
      connectionId: crypto.randomUUID(),
      playerId: crypto.randomUUID(),
      roomId,
      joined: false,
    };

    server.serializeAttachment(attachment);
    this.ctx.acceptWebSocket(server);

    this.send(server, {
      type: "connected",
      playerId: attachment.playerId,
      roomId,
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer
  ): Promise<void> {
    if (typeof message !== "string") {
      this.sendError(ws, "Il messaggio deve essere una stringa JSON.");
      return;
    }

    let clientMessage: ClientMessage;

    try {
      clientMessage = JSON.parse(message) as ClientMessage;
    } catch {
      this.sendError(ws, "JSON non valido.");
      return;
    }

    switch (clientMessage.type) {
      case "createRoom":
        await this.createRoom(ws, clientMessage.name);
        return;
      case "joinRoom":
        await this.joinRoom(ws, clientMessage.name);
        return;
      case "startGame":
        await this.startSetup(ws);
        return;
      case "submitGameSetup":
        await this.submitGameSetup(ws, clientMessage);
        return;
      case "submitAnswer":
        await this.submitAnswer(ws, clientMessage.answer);
        return;
      case "confirmAnswers":
        await this.confirmAnswers(ws);
        return;
      case "showAnswers":
        await this.showAnswers(ws);
        return;
      case "showResults":
        await this.showResults(ws);
        return;
      case "startNewGame":
        await this.startNewGame(ws);
        return;
      case "leaveRoom":
        await this.removePlayer(ws);
        return;
      case "sendChatMessage":
        await this.sendChatMessage(
          ws,
          clientMessage.toPlayerId,
          clientMessage.text
        );
        return;
      case "markChatAsRead":
        await this.markChatAsRead(ws, clientMessage.withPlayerId);
        return;
      default:
        this.sendError(ws, "Questa funzionalità realtime non è ancora stata migrata.");
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.removePlayer(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.removePlayer(ws);
  }

  private async createRoom(ws: WebSocket, name: string): Promise<void> {
    const attachment = this.getAttachment(ws);
    const normalizedName = name.trim();

    if (!normalizedName) {
      this.sendError(ws, "Nome non valido.");
      return;
    }

    const existingState = await this.ctx.storage.get<PersistedRoomState>(ROOM_STATE_KEY);

    if (existingState) {
      this.sendError(ws, "La stanza esiste già.");
      return;
    }

    const state: PersistedRoomState = {
      roomId: attachment.roomId,
      players: [{ id: attachment.playerId, name: normalizedName }],
      hostId: attachment.playerId,
      phase: "lobby",
      game: null,
    };

    await this.ctx.storage.put(ROOM_STATE_KEY, state);
    this.markConnectionJoined(ws, attachment);
    this.send(ws, {
      type: "roomCreated",
      playerId: attachment.playerId,
      roomId: attachment.roomId,
      state: this.getPublicState(state, attachment.playerId),
    });
    this.broadcastRoomState(state);
  }

  private async joinRoom(ws: WebSocket, name: string): Promise<void> {
    const attachment = this.getAttachment(ws);
    const normalizedName = name.trim();

    if (!normalizedName) {
      this.sendError(ws, "Nome non valido.");
      return;
    }

    const state = await this.ctx.storage.get<PersistedRoomState>(ROOM_STATE_KEY);

    if (!state) {
      this.sendError(ws, "La stanza non esiste.");
      return;
    }

    if (state.phase !== "lobby" && state.phase !== "setup") {
      this.sendError(ws, "La partita è già iniziata.");
      return;
    }

    const existingPlayer = state.players.find(
      (player) => player.id === attachment.playerId
    );

    if (existingPlayer) {
      existingPlayer.name = normalizedName;
    } else {
      state.players.push({ id: attachment.playerId, name: normalizedName });
    }

    await this.ctx.storage.put(ROOM_STATE_KEY, state);
    this.markConnectionJoined(ws, attachment);
    this.broadcastRoomState(state);
  }

  private async startSetup(ws: WebSocket): Promise<void> {
    const attachment = this.getAttachment(ws);
    const state = await this.ctx.storage.get<PersistedRoomState>(ROOM_STATE_KEY);

    if (!state) {
      this.sendError(ws, "La stanza non esiste.");
      return;
    }

    if (state.hostId !== attachment.playerId) {
      this.sendError(ws, "Solo l host puo iniziare la partita.");
      return;
    }

    if (this.activePlayers(state).length < 2) {
      this.sendError(ws, "Servono almeno 2 giocatori oltre all host per iniziare.");
      return;
    }

    if (state.phase !== "lobby") {
      this.sendError(ws, "La partita e gia iniziata.");
      return;
    }

    state.phase = "setup";
    state.game = this.createEmptyGame();

    await this.ctx.storage.put(ROOM_STATE_KEY, state);
    this.broadcastRoomState(state);
  }

  private async submitGameSetup(
    ws: WebSocket,
    setup: Extract<ClientMessage, { type: "submitGameSetup" }>
  ): Promise<void> {
    const attachment = this.getAttachment(ws);
    const state = await this.ctx.storage.get<PersistedRoomState>(ROOM_STATE_KEY);

    if (
      !state ||
      state.hostId !== attachment.playerId ||
      state.phase !== "setup"
    ) {
      this.sendError(ws, "Configurazione non consentita.");
      return;
    }

    const activePlayers = this.activePlayers(state);

    if (activePlayers.length < 2) {
      this.sendError(ws, "Servono almeno 2 giocatori attivi.");
      return;
    }

    if (
      typeof setup.impostorPlayerId !== "string" ||
      !activePlayers.some((player) => player.id === setup.impostorPlayerId)
    ) {
      this.sendError(ws, "Seleziona un impostore tra i giocatori attivi.");
      return;
    }

    if (
      typeof setup.normalQuestion !== "string" ||
      typeof setup.impostorQuestion !== "string" ||
      !setup.normalQuestion.trim() ||
      !setup.impostorQuestion.trim()
    ) {
      this.sendError(ws, "Inserisci entrambe le domande.");
      return;
    }

    const config: PersistedGameConfig = {
      impostorPlayerId: setup.impostorPlayerId,
      normalQuestion: setup.normalQuestion.trim(),
      impostorQuestion: setup.impostorQuestion.trim(),
    };

    state.game = {
      ...this.createEmptyGame(),
      config,
      assignments: activePlayers.map((player) => ({
        playerId: player.id,
        question:
          player.id === config.impostorPlayerId
            ? config.impostorQuestion
            : config.normalQuestion,
        isImpostor: player.id === config.impostorPlayerId,
      })),
    };
    state.phase = "answering";

    await this.ctx.storage.put(ROOM_STATE_KEY, state);
    this.broadcastRoomState(state);
    this.sendPersonalQuestions(state);
  }

  private async submitAnswer(ws: WebSocket, answer: string): Promise<void> {
    const attachment = this.getAttachment(ws);
    const state = await this.ctx.storage.get<PersistedRoomState>(ROOM_STATE_KEY);

    if (state?.phase !== "answering" || !state.game) {
      this.sendError(ws, "Le risposte non sono disponibili in questa fase.");
      return;
    }

    const player = this.activePlayers(state).find(
      (currentPlayer) => currentPlayer.id === attachment.playerId
    );
    const hasAssignment = state.game.assignments.some(
      (assignment) => assignment.playerId === attachment.playerId
    );

    if (!player || !hasAssignment) {
      this.sendError(ws, "Solo i giocatori attivi possono rispondere.");
      return;
    }

    if (typeof answer !== "string" || !answer.trim()) {
      this.sendError(ws, "La risposta non puo essere vuota.");
      return;
    }

    const playerAnswer: PlayerAnswer = {
      playerId: player.id,
      playerName: player.name,
      answer: answer.trim(),
    };
    const existingAnswerIndex = state.game.answers.findIndex(
      (currentAnswer) => currentAnswer.playerId === attachment.playerId
    );

    if (existingAnswerIndex === -1) {
      state.game.answers.push(playerAnswer);
    } else {
      state.game.answers[existingAnswerIndex] = playerAnswer;
    }

    await this.ctx.storage.put(ROOM_STATE_KEY, state);
    this.broadcastRoomState(state);
  }

  private async confirmAnswers(ws: WebSocket): Promise<void> {
    const attachment = this.getAttachment(ws);
    const state = await this.ctx.storage.get<PersistedRoomState>(ROOM_STATE_KEY);

    if (
      !state ||
      state.hostId !== attachment.playerId ||
      state.phase !== "answering" ||
      !state.game
    ) {
      this.sendError(ws, "Conferma non consentita.");
      return;
    }

    if (!this.allPlayersAnswered(state)) {
      this.sendError(ws, "Non tutti i giocatori hanno risposto.");
      return;
    }

    state.game.answersVisible = false;
    state.phase = "answersReady";

    await this.ctx.storage.put(ROOM_STATE_KEY, state);
    this.broadcastRoomState(state);
  }

  private async showAnswers(ws: WebSocket): Promise<void> {
    const attachment = this.getAttachment(ws);
    const state = await this.ctx.storage.get<PersistedRoomState>(ROOM_STATE_KEY);

    if (
      !state ||
      state.hostId !== attachment.playerId ||
      state.phase !== "answersReady" ||
      !state.game
    ) {
      this.sendError(ws, "Mostra risposte non consentito.");
      return;
    }

    state.game.answersVisible = true;

    await this.ctx.storage.put(ROOM_STATE_KEY, state);
    this.broadcastRoomState(state);
  }

  private async showResults(ws: WebSocket): Promise<void> {
    const attachment = this.getAttachment(ws);
    const state = await this.ctx.storage.get<PersistedRoomState>(ROOM_STATE_KEY);

    if (
      !state ||
      state.hostId !== attachment.playerId ||
      state.phase !== "answersReady" ||
      !state.game?.answersVisible
    ) {
      this.sendError(ws, "Azione non consentita.");
      return;
    }

    state.phase = "showResults";

    await this.ctx.storage.put(ROOM_STATE_KEY, state);
    this.broadcastRoomState(state);
  }

  private async startNewGame(ws: WebSocket): Promise<void> {
    const attachment = this.getAttachment(ws);
    const state = await this.ctx.storage.get<PersistedRoomState>(ROOM_STATE_KEY);

    if (
      !state ||
      state.hostId !== attachment.playerId ||
      state.phase !== "showResults"
    ) {
      this.sendError(ws, "Nuova partita non consentita.");
      return;
    }

    state.phase = "setup";
    state.game = this.createEmptyGame();

    await this.ctx.storage.put(ROOM_STATE_KEY, state);
    this.broadcastRoomState(state);
  }

  private async sendChatMessage(
    ws: WebSocket,
    toPlayerId: string,
    text: string
  ): Promise<void> {
    const attachment = this.getAttachment(ws);
    const state = await this.ctx.storage.get<PersistedRoomState>(ROOM_STATE_KEY);

    if (!state?.game || !this.canUseChat(state)) {
      this.sendError(ws, "La chat non e disponibile in questa fase.");
      return;
    }

    if (
      typeof text !== "string" ||
      typeof toPlayerId !== "string" ||
      !text.trim() ||
      !this.isValidChatRecipient(state, attachment.playerId, toPlayerId)
    ) {
      this.sendError(ws, "Destinatario o messaggio non valido.");
      return;
    }

    const chatMessage: ChatMessage = {
      id: crypto.randomUUID(),
      fromPlayerId: attachment.playerId,
      toPlayerId,
      text: text.trim(),
      createdAt: Date.now(),
    };

    state.game.chats.push(chatMessage);
    this.setUnread(
      state,
      toPlayerId,
      attachment.playerId,
      this.getUnread(state, toPlayerId, attachment.playerId) + 1
    );

    await this.ctx.storage.put(ROOM_STATE_KEY, state);
    this.broadcastRoomState(state);
  }

  private async markChatAsRead(
    ws: WebSocket,
    withPlayerId: string
  ): Promise<void> {
    const attachment = this.getAttachment(ws);
    const state = await this.ctx.storage.get<PersistedRoomState>(ROOM_STATE_KEY);

    if (
      !state?.game ||
      !this.canUseChat(state) ||
      typeof withPlayerId !== "string" ||
      !this.isValidChatRecipient(
        state,
        attachment.playerId,
        withPlayerId
      )
    ) {
      this.sendError(ws, "Chat non disponibile.");
      return;
    }

    this.setUnread(state, attachment.playerId, withPlayerId, 0);

    await this.ctx.storage.put(ROOM_STATE_KEY, state);
    this.broadcastRoomState(state);
  }

  private async removePlayer(ws: WebSocket): Promise<void> {
    const attachment = this.getAttachment(ws);

    if (!attachment.joined) {
      return;
    }

    this.markConnectionLeft(ws, attachment);

    if (this.hasJoinedReplacement(ws, attachment)) {
      console.info("[room] stale connection closed; player kept", {
        roomId: attachment.roomId,
        playerId: attachment.playerId,
        connectionId: attachment.connectionId,
      });
      return;
    }

    const state = await this.ctx.storage.get<PersistedRoomState>(ROOM_STATE_KEY);

    if (!state) {
      return;
    }

    const playerExists = state.players.some(
      (player) => player.id === attachment.playerId
    );

    if (!playerExists) {
      return;
    }

    if (state.hostId === attachment.playerId) {
      this.broadcast(
        {
          type: "roomClosed",
          message: "L’host ha abbandonato la stanza. La partita è stata interrotta.",
        },
        attachment.playerId
      );
      await this.ctx.storage.delete(ROOM_STATE_KEY);
      return;
    }

    state.players = state.players.filter(
      (player: Player) => player.id !== attachment.playerId
    );

    if (state.game) {
      state.game.assignments = state.game.assignments.filter(
        (assignment) => assignment.playerId !== attachment.playerId
      );
      state.game.answers = state.game.answers.filter(
        (answer) =>
          answer.playerId !== attachment.playerId &&
          answer.playerId !== state.hostId
      );
      state.game.chats = state.game.chats.filter(
        (message) =>
          message.fromPlayerId !== attachment.playerId &&
          message.toPlayerId !== attachment.playerId
      );
      delete state.game.unreadByUser[attachment.playerId];

      for (const unreadCounts of Object.values(state.game.unreadByUser)) {
        delete unreadCounts[attachment.playerId];
      }
    }

    await this.ctx.storage.put(ROOM_STATE_KEY, state);
    this.broadcastRoomState(state);
  }

  private activePlayers(state: PersistedRoomState): Player[] {
    return state.players.filter((player) => player.id !== state.hostId);
  }

  private allPlayersAnswered(state: PersistedRoomState): boolean {
    return Boolean(
      state.game &&
        this.activePlayers(state).every((player) =>
          state.game?.answers.some((answer) => answer.playerId === player.id)
        )
    );
  }

  private canUseChat(state: PersistedRoomState): boolean {
    return state.phase === "answering";
  }

  private isValidChatRecipient(
    state: PersistedRoomState,
    fromPlayerId: string,
    toPlayerId: string
  ): boolean {
    if (fromPlayerId === state.hostId) {
      return this.activePlayers(state).some(
        (player) => player.id === toPlayerId
      );
    }

    return (
      toPlayerId === state.hostId &&
      this.activePlayers(state).some(
        (player) => player.id === fromPlayerId
      )
    );
  }

  private getUnread(
    state: PersistedRoomState,
    userId: string,
    fromPlayerId: string
  ): number {
    return state.game?.unreadByUser[userId]?.[fromPlayerId] ?? 0;
  }

  private setUnread(
    state: PersistedRoomState,
    userId: string,
    fromPlayerId: string,
    count: number
  ): void {
    if (!state.game) {
      return;
    }

    const unreadForUser = state.game.unreadByUser[userId] ?? {};
    unreadForUser[fromPlayerId] = count;
    state.game.unreadByUser[userId] = unreadForUser;
  }

  private getRoundResults(state: PersistedRoomState): RoundResult[] {
    if (!state.game) {
      return [];
    }

    const activePlayerIds = new Set(
      this.activePlayers(state).map((player) => player.id)
    );

    return state.game.answers
      .filter((answer) => activePlayerIds.has(answer.playerId))
      .flatMap((answer) => {
        const assignment = state.game?.assignments.find(
          (item) => item.playerId === answer.playerId
        );

        return assignment
          ? [{
              ...answer,
              question: assignment.question,
              isImpostor: assignment.isImpostor,
            }]
          : [];
      });
  }

  private createEmptyGame(): PersistedGameState {
    return {
      config: null,
      answersVisible: false,
      assignments: [],
      answers: [],
      chats: [],
      unreadByUser: {},
    };
  }

  private getPublicState(
    state: PersistedRoomState,
    connectionId: string
  ): RoomState {
    const activePlayers = this.activePlayers(state);
    const activePlayerIds = new Set(activePlayers.map((player) => player.id));
    const answers =
      state.game?.answers.filter((answer) =>
        activePlayerIds.has(answer.playerId)
      ) ?? [];
    const isHost = connectionId === state.hostId;
    const canSeeAnswers =
      (isHost && state.phase === "answering") ||
      (state.phase === "answersReady" && Boolean(state.game?.answersVisible));
    const canSeeResults = state.phase === "showResults";
    const chatIsAvailable = this.canUseChat(state);
    const visibleChats = chatIsAvailable
      ? state.game?.chats.filter(
          (message) =>
            isHost ||
            message.fromPlayerId === connectionId ||
            message.toPlayerId === connectionId
        ) ?? []
      : [];
    const unreadChatsByPlayerId =
      isHost && chatIsAvailable
        ? Object.fromEntries(
            activePlayers.map((player) => [
              player.id,
              this.getUnread(state, connectionId, player.id),
            ])
          )
        : {};

    return {
      roomId: state.roomId,
      players: state.players,
      hostId: state.hostId,
      phase: state.phase,
      game: state.game
        ? {
            answeredPlayerIds: answers.map((answer) => answer.playerId),
            allPlayersAnswered: this.allPlayersAnswered(state),
            answersVisible: state.game.answersVisible,
            answers: canSeeAnswers ? answers : null,
            results: canSeeResults ? this.getRoundResults(state) : null,
            chatMessages: visibleChats,
            unreadChatCount:
              !chatIsAvailable || isHost || !state.hostId
                ? 0
                : this.getUnread(state, connectionId, state.hostId),
            unreadChatsByPlayerId,
          }
        : null,
    };
  }

  private broadcastRoomState(state: PersistedRoomState): void {
    for (const socket of this.ctx.getWebSockets()) {
      try {
        const attachment = this.getAttachment(socket);

        if (!attachment.joined || attachment.roomId !== state.roomId) {
          continue;
        }

        this.send(socket, {
          type: "roomState",
          state: this.getPublicState(state, attachment.playerId),
        });
      } catch (error) {
        console.error("[room] roomState broadcast skipped a socket", {
          roomId: state.roomId,
          error,
        });
      }
    }
  }

  private sendPersonalQuestions(state: PersistedRoomState): void {
    if (!state.game) {
      return;
    }

    for (const socket of this.ctx.getWebSockets()) {
      try {
        const attachment = this.getAttachment(socket);

        if (!attachment.joined || attachment.roomId !== state.roomId) {
          continue;
        }

        const assignment = state.game.assignments.find(
          (item) => item.playerId === attachment.playerId
        );

        if (assignment) {
          this.send(socket, {
            type: "yourQuestion",
            question: assignment.question,
          });
        }
      } catch (error) {
        console.error("[room] personal question skipped a socket", {
          roomId: state.roomId,
          error,
        });
      }
    }
  }

  private broadcast(message: ServerMessage, excludedPlayerId?: string): void {
    for (const socket of this.ctx.getWebSockets()) {
      try {
        const attachment = this.getAttachment(socket);

        if (attachment.joined && attachment.playerId !== excludedPlayerId) {
          this.send(socket, message);
        }
      } catch (error) {
        console.error("[room] broadcast skipped a socket", { error });
      }
    }
  }

  private send(ws: WebSocket, message: ServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      const attachment = ws.deserializeAttachment() as Partial<ConnectionAttachment> | null;

      console.error("[room] WebSocket send failed", {
        roomId: attachment?.roomId,
        playerId: attachment?.playerId,
        connectionId: attachment?.connectionId,
        messageType: message.type,
        error,
      });
    }
  }

  private sendError(ws: WebSocket, message: string): void {
    this.send(ws, { type: "error", message });
  }

  private getAttachment(ws: WebSocket): ConnectionAttachment {
    const attachment = ws.deserializeAttachment() as Partial<ConnectionAttachment> | null;

    if (
      !attachment ||
      typeof attachment.playerId !== "string" ||
      typeof attachment.roomId !== "string"
    ) {
      throw new Error("WebSocket connection attachment is missing or invalid.");
    }

    const normalizedAttachment: ConnectionAttachment = {
      connectionId:
        typeof attachment.connectionId === "string"
          ? attachment.connectionId
          : attachment.playerId,
      playerId: attachment.playerId,
      roomId: attachment.roomId,
      joined:
        typeof attachment.joined === "boolean"
          ? attachment.joined
          : true,
    };

    if (
      attachment.connectionId !== normalizedAttachment.connectionId ||
      attachment.joined !== normalizedAttachment.joined
    ) {
      ws.serializeAttachment(normalizedAttachment);
    }

    return normalizedAttachment;
  }

  private markConnectionJoined(
    ws: WebSocket,
    attachment: ConnectionAttachment
  ): void {
    attachment.joined = true;
    ws.serializeAttachment(attachment);
  }

  private markConnectionLeft(
    ws: WebSocket,
    attachment: ConnectionAttachment
  ): void {
    attachment.joined = false;
    ws.serializeAttachment(attachment);
  }

  private hasJoinedReplacement(
    closingSocket: WebSocket,
    closingAttachment: ConnectionAttachment
  ): boolean {
    return this.ctx.getWebSockets().some((socket) => {
      if (socket === closingSocket) {
        return false;
      }

      try {
        const attachment = this.getAttachment(socket);

        return (
          attachment.joined &&
          attachment.roomId === closingAttachment.roomId &&
          attachment.playerId === closingAttachment.playerId
        );
      } catch {
        return false;
      }
    });
  }

  private getRoomId(request: Request): string | null {
    const match = new URL(request.url).pathname.match(/^\/room\/([^/]+)$/);
    const roomId = match?.[1]?.toUpperCase();

    return roomId && ROOM_CODE_PATTERN.test(roomId) ? roomId : null;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const match = url.pathname.match(/^\/room\/([^/]+)$/);

    if (!match) {
      return new Response(
        "Use /room/{roomCode}",
        { status: 404 }
      );
    }

    const roomCode = match[1].toUpperCase();

    if (!ROOM_CODE_PATTERN.test(roomCode)) {
      return new Response("Invalid room code", { status: 400 });
    }

    const room = env.ROOMS.getByName(roomCode);

    return room.fetch(request);
  },
} satisfies ExportedHandler<Env>;
