import { DurableObject } from "cloudflare:workers";

import { createQuestionRepository } from "./questions/createQuestionRepository";
import {
  parseQuestionCategories,
  restoreClassicCategories,
  shouldResetQuestionDeck,
} from "./questions/categorySelection";
import type { QuestionRepository } from "./questions/types";

import {
  DEFAULT_CLASSIC_CATEGORIES,
} from "../src/shared/types";
import type {
  ChatMessage,
  ClientMessage,
  GameMode,
  Player,
  PlayerAnswer,
  RoomPhase,
  RoomState,
  RoundResult,
  ServerMessage,
  QuestionCategory,
} from "../src/shared/types";

interface Env {
  ROOMS: DurableObjectNamespace<GameRoom>;
  QUESTIONS_DB?: D1Database;
}

type ConnectionAttachment = {
  connectionId: string;
  playerId: string;
  roomId: string;
  joined: boolean;
  credentialsSent: boolean;
};

type InternalPlayer = Player & {
  resumeToken: string;
  activeConnectionId: string | null;
  disconnectedAt: number | null;
  disconnectExpiresAt: number | null;
};

type RoundConfig = {
  questionSetId: string | null;
  impostorPlayerId: string;
  normalQuestion: string;
  impostorQuestion: string;
};

type InternalPlayerAssignment = {
  playerId: string;
  question: string;
  isImpostor: boolean;
};

type InternalRoundState = {
  config: RoundConfig | null;
  answersVisible: boolean;
  assignments: InternalPlayerAssignment[];
  answers: PlayerAnswer[];
  chats: ChatMessage[];
  unreadByUser: Record<string, Record<string, number>>;
};

type ClassicQuestionState = {
  deck: string[];
  cursor: number;
  categories: QuestionCategory[];
};

type PersistedGameRoomState = {
  schemaVersion: 3;
  roomId: string;
  mode: GameMode;
  classicCategories: QuestionCategory[] | null;
  hostId: string | null;
  players: InternalPlayer[];
  phase: RoomPhase;
  classicQuestions: ClassicQuestionState | null;
  round: InternalRoundState | null;
};

type VersionTwoPersistedGameRoomState = Omit<
  PersistedGameRoomState,
  "schemaVersion" | "classicCategories" | "classicQuestions"
> & {
  schemaVersion: 2;
  classicQuestions: {
    deck: string[];
    cursor: number;
  } | null;
};

type VersionOnePersistedGameRoomState = Omit<
  VersionTwoPersistedGameRoomState,
  "schemaVersion" | "players"
> & {
  schemaVersion: 1;
  players: Player[];
};

type LegacyPersistedGameRoomState = {
  roomId: string;
  players: InternalPlayer[];
  hostId: string | null;
  phase: RoomPhase;
  game: (Omit<InternalRoundState, "config"> & {
    config: Omit<RoundConfig, "questionSetId"> | null;
  }) | null;
};

const ROOM_STATE_KEY = "roomState";
const ROOM_CODE_PATTERN = /^[A-Z1-9]{4}$/;
const DISCONNECT_GRACE_MS = 30_000;

export class GameRoom extends DurableObject<Env> {
  private readonly questionRepository: QuestionRepository;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.questionRepository = createQuestionRepository(env);
  }

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
      credentialsSent: false,
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

    if (
      clientMessage.type !== "createRoom" &&
      clientMessage.type !== "joinRoom" &&
      clientMessage.type !== "resumeRoom" &&
      !(await this.isActiveConnection(ws))
    ) {
      return;
    }

    switch (clientMessage.type) {
      case "createRoom":
        await this.createRoom(
          ws,
          clientMessage.name,
          clientMessage.mode,
          clientMessage.classicCategories
        );
        return;
      case "joinRoom":
        await this.joinRoom(ws, clientMessage.name);
        return;
      case "resumeRoom":
        await this.resumeRoom(ws, clientMessage.resumeToken);
        return;
      case "startGame":
        await this.startGame(ws);
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
        await this.leaveRoom(ws);
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
    await this.handleUnexpectedDisconnect(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.handleUnexpectedDisconnect(ws);
  }

  async alarm(): Promise<void> {
    const state = await this.getPersistedState();

    if (state) {
      await this.removeExpiredPlayers(state, Date.now());
    }
  }

  private async createRoom(
    ws: WebSocket,
    name: string,
    mode: GameMode,
    classicCategories: unknown
  ): Promise<void> {
    const attachment = this.getAttachment(ws);
    const normalizedName = name.trim();

    if (!normalizedName) {
      this.sendError(ws, "Nome non valido.");
      return;
    }

    if (mode !== "manual" && mode !== "classic") {
      this.sendError(ws, "Modalità di gioco non valida.");
      return;
    }

    const selectedClassicCategories = mode === "classic"
      ? classicCategories === undefined
        ? [...DEFAULT_CLASSIC_CATEGORIES]
        : parseQuestionCategories(classicCategories)
      : null;

    if (mode === "classic" && !selectedClassicCategories) {
      this.sendError(
        ws,
        "Seleziona almeno una categoria valida tra Testuali, Numeriche ed Extra."
      );
      return;
    }

    const existingState = await this.getPersistedState();

    if (existingState) {
      this.sendError(ws, "La stanza esiste già.");
      return;
    }

    const state: PersistedGameRoomState = {
      schemaVersion: 3,
      roomId: attachment.roomId,
      mode,
      classicCategories: selectedClassicCategories,
      hostId: attachment.playerId,
      players: [this.createInternalPlayer(attachment, normalizedName)],
      phase: "lobby",
      classicQuestions: null,
      round: null,
    };

    await this.ctx.storage.put(ROOM_STATE_KEY, state);
    this.markConnectionJoined(ws, attachment);
    this.sendSessionCredentials(ws, state.players[0]);
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

    const state = await this.getPersistedState();

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
      existingPlayer.activeConnectionId = attachment.connectionId;
      existingPlayer.disconnectedAt = null;
      existingPlayer.disconnectExpiresAt = null;
    } else {
      state.players.push(this.createInternalPlayer(attachment, normalizedName));
    }

    await this.ctx.storage.put(ROOM_STATE_KEY, state);
    this.markConnectionJoined(ws, attachment);
    const joinedPlayer = state.players.find((player) => player.id === attachment.playerId);

    if (joinedPlayer) {
      this.sendSessionCredentials(ws, joinedPlayer);
    }

    await this.scheduleNextDisconnectAlarm(state);
    this.broadcastRoomState(state);
  }

  private async resumeRoom(ws: WebSocket, resumeToken: string): Promise<void> {
    const attachment = this.getAttachment(ws);
    const state = await this.getPersistedState();

    if (!state || typeof resumeToken !== "string" || !resumeToken) {
      this.sendInvalidResumeToken(ws);
      return;
    }

    const player = state.players.find(
      (candidate) => candidate.resumeToken === resumeToken
    );

    if (!player || player.disconnectExpiresAt !== null && player.disconnectExpiresAt <= Date.now()) {
      if (player) {
        await this.removeExpiredPlayers(state, Date.now());
      }

      this.sendInvalidResumeToken(ws);
      return;
    }

    attachment.playerId = player.id;
    attachment.joined = true;
    attachment.credentialsSent = false;
    ws.serializeAttachment(attachment);

    player.activeConnectionId = attachment.connectionId;
    player.disconnectedAt = null;
    player.disconnectExpiresAt = null;

    await this.ctx.storage.put(ROOM_STATE_KEY, state);
    await this.scheduleNextDisconnectAlarm(state);
    this.replacePlayerConnection(ws, attachment);
    this.sendSessionCredentials(ws, player);
    this.sendRoomState(ws, state, player.id);
    this.sendPersonalQuestion(ws, state, player.id);
    this.broadcastRoomState(state);
  }

  private async startGame(ws: WebSocket): Promise<void> {
    const attachment = this.getAttachment(ws);
    const state = await this.getPersistedState();

    if (!state) {
      this.sendError(ws, "La stanza non esiste.");
      return;
    }

    if (state.hostId !== attachment.playerId) {
      this.sendError(ws, "Solo l host puo iniziare la partita.");
      return;
    }

    if (state.phase !== "lobby") {
      this.sendError(ws, "La partita e gia iniziata.");
      return;
    }

    const participants = this.getRoundParticipants(state);

    if (state.mode === "manual") {
      if (participants.length < 2) {
        this.sendError(ws, "Servono almeno 2 giocatori oltre all host per iniziare.");
        return;
      }

      state.phase = "setup";
      state.round = this.createEmptyRound();

      await this.ctx.storage.put(ROOM_STATE_KEY, state);
      this.broadcastRoomState(state);
      return;
    }

    if (participants.length < 3) {
      this.sendError(ws, "Servono almeno 3 giocatori per iniziare.");
      return;
    }

    const config = await this.resolveClassicRoundConfig(ws, state);

    if (config) {
      await this.activateRound(state, config);
    }
  }

  private async submitGameSetup(
    ws: WebSocket,
    setup: Extract<ClientMessage, { type: "submitGameSetup" }>
  ): Promise<void> {
    const attachment = this.getAttachment(ws);
    const state = await this.getPersistedState();

    if (
      !state ||
      state.mode !== "manual" ||
      state.hostId !== attachment.playerId ||
      state.phase !== "setup"
    ) {
      this.sendError(ws, "Configurazione non consentita.");
      return;
    }

    const config = this.resolveManualRoundConfig(ws, state, setup);

    if (!config) {
      return;
    }

    await this.activateRound(state, config);
  }

  private resolveManualRoundConfig(
    ws: WebSocket,
    state: PersistedGameRoomState,
    setup: Extract<ClientMessage, { type: "submitGameSetup" }>
  ): RoundConfig | null {
    const activePlayers = this.getRoundParticipants(state);

    if (activePlayers.length < 2) {
      this.sendError(ws, "Servono almeno 2 giocatori attivi.");
      return null;
    }

    if (
      typeof setup.impostorPlayerId !== "string" ||
      !activePlayers.some((player) => player.id === setup.impostorPlayerId)
    ) {
      this.sendError(ws, "Seleziona un impostore tra i giocatori attivi.");
      return null;
    }

    if (
      typeof setup.normalQuestion !== "string" ||
      typeof setup.impostorQuestion !== "string" ||
      !setup.normalQuestion.trim() ||
      !setup.impostorQuestion.trim()
    ) {
      this.sendError(ws, "Inserisci entrambe le domande.");
      return null;
    }

    return {
      questionSetId: null,
      impostorPlayerId: setup.impostorPlayerId,
      normalQuestion: setup.normalQuestion.trim(),
      impostorQuestion: setup.impostorQuestion.trim(),
    };
  }

  private async resolveClassicRoundConfig(
    ws: WebSocket,
    state: PersistedGameRoomState
  ): Promise<RoundConfig | null> {
    const selectedCategories = state.classicCategories ?? [...DEFAULT_CLASSIC_CATEGORIES];

    if (
      !state.classicQuestions ||
      shouldResetQuestionDeck(
        state.classicQuestions.categories,
        selectedCategories
      )
    ) {
      try {
        const activeIds = await this.questionRepository.listActiveIds(selectedCategories);

        if (activeIds.length === 0) {
          this.sendError(ws, "Non ci sono domande classiche disponibili.");
          return null;
        }

        state.classicQuestions = {
          deck: this.shuffleQuestionIds(activeIds),
          cursor: 0,
          categories: [...selectedCategories],
        };
      } catch (error) {
        console.error("[room] failed to initialize classic question deck", {
          roomId: state.roomId,
          error,
        });
        this.sendError(ws, "Impossibile caricare le domande classiche.");
        return null;
      }
    }

    const questionState = state.classicQuestions;

    if (questionState.cursor >= questionState.deck.length) {
      this.sendError(
        ws,
        "Tutte le domande disponibili sono già state utilizzate in questa sessione."
      );
      return null;
    }

    while (questionState.cursor < questionState.deck.length) {
      const questionSetId = questionState.deck[questionState.cursor];
      questionState.cursor += 1;

      try {
        const questionSet = await this.questionRepository.getById(questionSetId);

        if (!questionSet || !selectedCategories.includes(questionSet.category)) {
          continue;
        }

        const participants = this.getRoundParticipants(state);
        const impostorPlayer = participants[this.randomIndex(participants.length)];

        return {
          questionSetId: questionSet.id,
          normalQuestion: questionSet.normalQuestion,
          impostorQuestion: questionSet.impostorQuestion,
          impostorPlayerId: impostorPlayer.id,
        };
      } catch (error) {
        console.error("[room] failed to load classic question", {
          roomId: state.roomId,
          questionSetId,
          error,
        });
        this.sendError(ws, "Impossibile caricare la domanda classica.");
        return null;
      }
    }

    await this.ctx.storage.put(ROOM_STATE_KEY, state);
    this.sendError(
      ws,
      "Tutte le domande disponibili sono già state utilizzate in questa sessione."
    );
    return null;
  }

  private async activateRound(
    state: PersistedGameRoomState,
    config: RoundConfig
  ): Promise<void> {
    const participants = this.getRoundParticipants(state);

    state.round = {
      ...this.createEmptyRound(),
      config,
      assignments: participants.map((player) => ({
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
    const state = await this.getPersistedState();

    if (state?.phase !== "answering" || !state.round) {
      this.sendError(ws, "Le risposte non sono disponibili in questa fase.");
      return;
    }

    const player = this.getRoundParticipants(state).find(
      (currentPlayer) => currentPlayer.id === attachment.playerId
    );
    const hasAssignment = state.round.assignments.some(
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
    const existingAnswerIndex = state.round.answers.findIndex(
      (currentAnswer) => currentAnswer.playerId === attachment.playerId
    );

    if (existingAnswerIndex === -1) {
      state.round.answers.push(playerAnswer);
    } else {
      state.round.answers[existingAnswerIndex] = playerAnswer;
    }

    this.advanceClassicRoundIfComplete(state);

    await this.ctx.storage.put(ROOM_STATE_KEY, state);
    this.broadcastRoomState(state);
  }

  private async confirmAnswers(ws: WebSocket): Promise<void> {
    const attachment = this.getAttachment(ws);
    const state = await this.getPersistedState();

    if (
      !state ||
      state.mode !== "manual" ||
      state.hostId !== attachment.playerId ||
      state.phase !== "answering" ||
      !state.round
    ) {
      this.sendError(ws, "Conferma non consentita.");
      return;
    }

    if (!this.allPlayersAnswered(state)) {
      this.sendError(ws, "Non tutti i giocatori hanno risposto.");
      return;
    }

    state.round.answersVisible = false;
    state.phase = "answersReady";

    await this.ctx.storage.put(ROOM_STATE_KEY, state);
    this.broadcastRoomState(state);
  }

  private async showAnswers(ws: WebSocket): Promise<void> {
    const attachment = this.getAttachment(ws);
    const state = await this.getPersistedState();

    if (
      !state ||
      state.hostId !== attachment.playerId ||
      state.phase !== "answersReady" ||
      !state.round
    ) {
      this.sendError(ws, "Mostra risposte non consentito.");
      return;
    }

    state.round.answersVisible = true;

    await this.ctx.storage.put(ROOM_STATE_KEY, state);
    this.broadcastRoomState(state);
  }

  private async showResults(ws: WebSocket): Promise<void> {
    const attachment = this.getAttachment(ws);
    const state = await this.getPersistedState();

    if (
      !state ||
      state.hostId !== attachment.playerId ||
      state.phase !== "answersReady" ||
      !state.round?.answersVisible
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
    const state = await this.getPersistedState();

    if (
      !state ||
      state.hostId !== attachment.playerId ||
      state.phase !== "showResults"
    ) {
      this.sendError(ws, "Nuova partita non consentita.");
      return;
    }

    if (state.mode === "classic") {
      if (this.getRoundParticipants(state).length < 3) {
        this.sendError(ws, "Servono almeno 3 giocatori per iniziare.");
        return;
      }

      const config = await this.resolveClassicRoundConfig(ws, state);

      if (config) {
        await this.activateRound(state, config);
      }

      return;
    }

    state.phase = "setup";
    state.round = this.createEmptyRound();

    await this.ctx.storage.put(ROOM_STATE_KEY, state);
    this.broadcastRoomState(state);
  }

  private async sendChatMessage(
    ws: WebSocket,
    toPlayerId: string,
    text: string
  ): Promise<void> {
    const attachment = this.getAttachment(ws);
    const state = await this.getPersistedState();

    if (!state?.round || !this.canUseChat(state)) {
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

    state.round.chats.push(chatMessage);
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
    const state = await this.getPersistedState();

    if (
      !state?.round ||
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

  private async leaveRoom(ws: WebSocket): Promise<void> {
    const attachment = this.getAttachment(ws);

    if (!attachment.joined) {
      return;
    }

    this.markConnectionLeft(ws, attachment);
    const state = await this.getPersistedState();

    if (!state) {
      return;
    }

    const player = state.players.find(
      (candidate) => candidate.id === attachment.playerId
    );

    if (!player || player.activeConnectionId !== attachment.connectionId) {
      return;
    }

    if (state.hostId === attachment.playerId) {
      await this.closeRoom(attachment.playerId);
      return;
    }

    this.removePlayerFromState(state, attachment.playerId);
    this.advanceClassicRoundIfComplete(state);
    await this.ctx.storage.put(ROOM_STATE_KEY, state);
    await this.scheduleNextDisconnectAlarm(state);
    this.broadcastRoomState(state);
  }

  private async handleUnexpectedDisconnect(ws: WebSocket): Promise<void> {
    const attachment = this.getAttachment(ws);

    if (!attachment.joined) {
      return;
    }

    this.markConnectionLeft(ws, attachment);
    const state = await this.getPersistedState();
    const player = state?.players.find(
      (candidate) => candidate.id === attachment.playerId
    );

    if (!state || !player || player.activeConnectionId !== attachment.connectionId) {
      return;
    }

    const disconnectedAt = Date.now();
    player.activeConnectionId = null;
    player.disconnectedAt = disconnectedAt;
    player.disconnectExpiresAt = disconnectedAt + DISCONNECT_GRACE_MS;

    await this.ctx.storage.put(ROOM_STATE_KEY, state);
    await this.scheduleNextDisconnectAlarm(state);
    this.broadcastRoomState(state);
  }

  private async removeExpiredPlayers(
    state: PersistedGameRoomState,
    now: number
  ): Promise<void> {
    const expiredPlayerIds = state.players
      .filter(
        (player) =>
          player.activeConnectionId === null &&
          player.disconnectExpiresAt !== null &&
          player.disconnectExpiresAt <= now
      )
      .map((player) => player.id);

    if (state.hostId && expiredPlayerIds.includes(state.hostId)) {
      await this.closeRoom();
      return;
    }

    for (const playerId of expiredPlayerIds) {
      this.removePlayerFromState(state, playerId);
    }

    if (expiredPlayerIds.length > 0) {
      this.advanceClassicRoundIfComplete(state);
      await this.ctx.storage.put(ROOM_STATE_KEY, state);
      this.broadcastRoomState(state);
    }

    await this.scheduleNextDisconnectAlarm(state);
  }

  private removePlayerFromState(
    state: PersistedGameRoomState,
    playerId: string
  ): void {
    state.players = state.players.filter((player) => player.id !== playerId);

    if (state.round) {
      state.round.assignments = state.round.assignments.filter(
        (assignment) => assignment.playerId !== playerId
      );
      state.round.answers = state.round.answers.filter(
        (answer) => answer.playerId !== playerId
      );
      state.round.chats = state.round.chats.filter(
        (message) =>
          message.fromPlayerId !== playerId &&
          message.toPlayerId !== playerId
      );
      delete state.round.unreadByUser[playerId];

      for (const unreadCounts of Object.values(state.round.unreadByUser)) {
        delete unreadCounts[playerId];
      }
    }
  }

  private async closeRoom(excludedPlayerId?: string): Promise<void> {
    this.broadcast(
      {
        type: "roomClosed",
        message: "L’host ha abbandonato la stanza. La partita è stata interrotta.",
      },
      excludedPlayerId
    );

    await this.ctx.storage.delete(ROOM_STATE_KEY);
    await this.ctx.storage.deleteAlarm();
  }

  private getRoundParticipants(state: PersistedGameRoomState): InternalPlayer[] {
    return state.mode === "manual"
      ? state.players.filter((player) => player.id !== state.hostId)
      : state.players;
  }

  private shuffleQuestionIds(questionIds: string[]): string[] {
    const deck = [...questionIds];

    for (let index = deck.length - 1; index > 0; index -= 1) {
      const targetIndex = this.randomIndex(index + 1);
      [deck[index], deck[targetIndex]] = [deck[targetIndex], deck[index]];
    }

    return deck;
  }

  private randomIndex(length: number): number {
    if (!Number.isInteger(length) || length <= 0) {
      throw new Error("Cannot select a random index from an empty collection.");
    }

    const range = 0x1_0000_0000;
    const limit = range - (range % length);
    const randomValue = new Uint32Array(1);

    do {
      crypto.getRandomValues(randomValue);
    } while (randomValue[0] >= limit);

    return randomValue[0] % length;
  }

  private allPlayersAnswered(state: PersistedGameRoomState): boolean {
    return Boolean(
      state.round &&
        this.getRoundParticipants(state).every((player) =>
          state.round?.answers.some((answer) => answer.playerId === player.id)
        )
    );
  }

  private advanceClassicRoundIfComplete(
    state: PersistedGameRoomState
  ): void {
    if (
      state.mode === "classic" &&
      state.phase === "answering" &&
      state.round &&
      this.allPlayersAnswered(state)
    ) {
      state.round.answersVisible = false;
      state.phase = "answersReady";
    }
  }

  private canUseChat(state: PersistedGameRoomState): boolean {
    return state.mode === "manual" && state.phase === "answering";
  }

  private isValidChatRecipient(
    state: PersistedGameRoomState,
    fromPlayerId: string,
    toPlayerId: string
  ): boolean {
    if (fromPlayerId === state.hostId) {
      return this.getRoundParticipants(state).some(
        (player) => player.id === toPlayerId
      );
    }

    return (
      toPlayerId === state.hostId &&
      this.getRoundParticipants(state).some(
        (player) => player.id === fromPlayerId
      )
    );
  }

  private getUnread(
    state: PersistedGameRoomState,
    userId: string,
    fromPlayerId: string
  ): number {
    return state.round?.unreadByUser[userId]?.[fromPlayerId] ?? 0;
  }

  private setUnread(
    state: PersistedGameRoomState,
    userId: string,
    fromPlayerId: string,
    count: number
  ): void {
    if (!state.round) {
      return;
    }

    const unreadForUser = state.round.unreadByUser[userId] ?? {};
    unreadForUser[fromPlayerId] = count;
    state.round.unreadByUser[userId] = unreadForUser;
  }

  private getRoundResults(state: PersistedGameRoomState): RoundResult[] {
    if (!state.round) {
      return [];
    }

    const activePlayerIds = new Set(
      this.getRoundParticipants(state).map((player) => player.id)
    );

    return state.round.answers
      .filter((answer) => activePlayerIds.has(answer.playerId))
      .flatMap((answer) => {
        const assignment = state.round?.assignments.find(
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

  private createEmptyRound(): InternalRoundState {
    return {
      config: null,
      answersVisible: false,
      assignments: [],
      answers: [],
      chats: [],
      unreadByUser: {},
    };
  }

  private async getPersistedState(): Promise<PersistedGameRoomState | undefined> {
    const storedState = await this.ctx.storage.get<
      | PersistedGameRoomState
      | VersionTwoPersistedGameRoomState
      | VersionOnePersistedGameRoomState
      | LegacyPersistedGameRoomState
    >(ROOM_STATE_KEY);

    if (!storedState) {
      return storedState;
    }

    if ("schemaVersion" in storedState && storedState.schemaVersion === 3) {
      if (storedState.mode === "classic") {
        const normalizedCategories = restoreClassicCategories(
          storedState.mode,
          storedState.classicCategories
        );

        if (!normalizedCategories) {
          throw new Error("Classic rooms must have question categories.");
        }

        const categoriesChanged =
          JSON.stringify(storedState.classicCategories) !==
          JSON.stringify(normalizedCategories);
        const deckIsStale =
          storedState.classicQuestions !== null &&
          shouldResetQuestionDeck(
            storedState.classicQuestions.categories,
            normalizedCategories
          );

        storedState.classicCategories = normalizedCategories;

        if (categoriesChanged || deckIsStale) {
          storedState.classicQuestions = null;
          await this.ctx.storage.put(ROOM_STATE_KEY, storedState);
        }
      } else if (
        storedState.classicCategories !== null ||
        storedState.classicQuestions !== null
      ) {
        storedState.classicCategories = null;
        storedState.classicQuestions = null;
        await this.ctx.storage.put(ROOM_STATE_KEY, storedState);
      }

      return storedState;
    }

    const roomId = storedState.roomId;
    const legacyRound = "schemaVersion" in storedState
      ? storedState.round
      : storedState.game
        ? {
            ...storedState.game,
            config: storedState.game.config
              ? { ...storedState.game.config, questionSetId: null }
              : null,
          }
        : null;
    const disconnectedAt = Date.now();

    const migratedState: PersistedGameRoomState = {
      schemaVersion: 3,
      roomId,
      mode: "schemaVersion" in storedState ? storedState.mode : "manual",
      classicCategories: restoreClassicCategories(
        "schemaVersion" in storedState ? storedState.mode : "manual",
        undefined
      ),
      hostId: storedState.hostId,
      players: storedState.players.map((player) => {
        const activeConnectionId = this.findActiveConnectionId(roomId, player.id);

        return {
          id: player.id,
          name: player.name,
          resumeToken: crypto.randomUUID(),
          activeConnectionId,
          disconnectedAt: activeConnectionId ? null : disconnectedAt,
          disconnectExpiresAt: activeConnectionId
            ? null
            : disconnectedAt + DISCONNECT_GRACE_MS,
        };
      }),
      phase: storedState.phase,
      classicQuestions: null,
      round: legacyRound,
    };

    await this.ctx.storage.put(ROOM_STATE_KEY, migratedState);
    await this.scheduleNextDisconnectAlarm(migratedState);
    return migratedState;
  }

  private getPublicState(
    state: PersistedGameRoomState,
    connectionId: string
  ): RoomState {
    const activePlayers = this.getRoundParticipants(state);
    const activePlayerIds = new Set(activePlayers.map((player) => player.id));
    const answers =
      state.round?.answers.filter((answer) =>
        activePlayerIds.has(answer.playerId)
      ) ?? [];
    const isHost = connectionId === state.hostId;
    const canSeeAnswers =
      (state.mode === "manual" && isHost && state.phase === "answering") ||
      (state.phase === "answersReady" && Boolean(state.round?.answersVisible));
    const canSeeResults = state.phase === "showResults";
    const chatIsAvailable = this.canUseChat(state);
    const visibleChats = chatIsAvailable
      ? state.round?.chats.filter(
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
      mode: state.mode,
      classicCategories: state.classicCategories,
      players: state.players.map(({ id, name }) => ({ id, name })),
      hostId: state.hostId,
      phase: state.phase,
      game: state.round
        ? {
            answeredPlayerIds: answers.map((answer) => answer.playerId),
            allPlayersAnswered: this.allPlayersAnswered(state),
            answersVisible: state.round.answersVisible,
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

  private broadcastRoomState(state: PersistedGameRoomState): void {
    for (const socket of this.ctx.getWebSockets()) {
      try {
        const attachment = this.getAttachment(socket);

        const player = state.players.find(
          (candidate) => candidate.id === attachment.playerId
        );

        if (
          !attachment.joined ||
          attachment.roomId !== state.roomId ||
          player?.activeConnectionId !== attachment.connectionId
        ) {
          continue;
        }

        if (!attachment.credentialsSent) {
          this.sendSessionCredentials(socket, player);
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

  private sendPersonalQuestions(state: PersistedGameRoomState): void {
    if (!state.round) {
      return;
    }

    for (const socket of this.ctx.getWebSockets()) {
      try {
        const attachment = this.getAttachment(socket);

        const player = state.players.find(
          (candidate) => candidate.id === attachment.playerId
        );

        if (
          !attachment.joined ||
          attachment.roomId !== state.roomId ||
          player?.activeConnectionId !== attachment.connectionId
        ) {
          continue;
        }

        const assignment = state.round.assignments.find(
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

  private sendError(
    ws: WebSocket,
    message: string,
    code?: "INVALID_RESUME_TOKEN"
  ): void {
    this.send(ws, { type: "error", message, code });
  }

  private sendInvalidResumeToken(ws: WebSocket): void {
    this.sendError(
      ws,
      "Sessione non più valida. Entra nuovamente nella stanza.",
      "INVALID_RESUME_TOKEN"
    );
  }

  private sendSessionCredentials(
    ws: WebSocket,
    player: InternalPlayer
  ): void {
    const attachment = this.getAttachment(ws);

    this.send(ws, {
      type: "sessionCredentials",
      playerId: player.id,
      roomId: attachment.roomId,
      resumeToken: player.resumeToken,
    });
    attachment.credentialsSent = true;
    ws.serializeAttachment(attachment);
  }

  private sendRoomState(
    ws: WebSocket,
    state: PersistedGameRoomState,
    playerId: string
  ): void {
    this.send(ws, {
      type: "roomState",
      state: this.getPublicState(state, playerId),
    });
  }

  private sendPersonalQuestion(
    ws: WebSocket,
    state: PersistedGameRoomState,
    playerId: string
  ): void {
    if (state.phase !== "answering") {
      return;
    }

    const assignment = state.round?.assignments.find(
      (candidate) => candidate.playerId === playerId
    );

    if (assignment) {
      this.send(ws, {
        type: "yourQuestion",
        question: assignment.question,
      });
    }
  }

  private createInternalPlayer(
    attachment: ConnectionAttachment,
    name: string
  ): InternalPlayer {
    return {
      id: attachment.playerId,
      name,
      resumeToken: crypto.randomUUID(),
      activeConnectionId: attachment.connectionId,
      disconnectedAt: null,
      disconnectExpiresAt: null,
    };
  }

  private async isActiveConnection(ws: WebSocket): Promise<boolean> {
    const attachment = this.getAttachment(ws);

    if (!attachment.joined) {
      return false;
    }

    const state = await this.getPersistedState();
    const player = state?.players.find(
      (candidate) => candidate.id === attachment.playerId
    );
    if (!player || player.activeConnectionId !== attachment.connectionId) {
      return false;
    }

    if (!attachment.credentialsSent) {
      this.sendSessionCredentials(ws, player);
    }

    return true;
  }

  private replacePlayerConnection(
    currentSocket: WebSocket,
    currentAttachment: ConnectionAttachment
  ): void {
    for (const socket of this.ctx.getWebSockets()) {
      if (socket === currentSocket) {
        continue;
      }

      try {
        const attachment = this.getAttachment(socket);

        if (
          attachment.joined &&
          attachment.roomId === currentAttachment.roomId &&
          attachment.playerId === currentAttachment.playerId
        ) {
          this.markConnectionLeft(socket, attachment);
          socket.close(4001, "Session replaced by a newer connection");
        }
      } catch (error) {
        console.error("[room] failed to replace stale connection", { error });
      }
    }
  }

  private findActiveConnectionId(
    roomId: string,
    playerId: string
  ): string | null {
    for (const socket of this.ctx.getWebSockets()) {
      try {
        const attachment = this.getAttachment(socket);

        if (
          attachment.joined &&
          attachment.roomId === roomId &&
          attachment.playerId === playerId
        ) {
          return attachment.connectionId;
        }
      } catch {
        // Gli attachment non validi non possono recuperare una sessione.
      }
    }

    return null;
  }

  private async scheduleNextDisconnectAlarm(
    state: PersistedGameRoomState
  ): Promise<void> {
    const expirations = state.players.flatMap((player) =>
      player.activeConnectionId === null && player.disconnectExpiresAt !== null
        ? [player.disconnectExpiresAt]
        : []
    );

    if (expirations.length === 0) {
      await this.ctx.storage.deleteAlarm();
      return;
    }

    await this.ctx.storage.setAlarm(Math.min(...expirations));
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
      credentialsSent:
        typeof attachment.credentialsSent === "boolean"
          ? attachment.credentialsSent
          : false,
    };

    if (
      attachment.connectionId !== normalizedAttachment.connectionId ||
      attachment.joined !== normalizedAttachment.joined ||
      attachment.credentialsSent !== normalizedAttachment.credentialsSent
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
