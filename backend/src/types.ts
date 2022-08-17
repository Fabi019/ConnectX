export interface Player {
  uid: string,
  nickname: string,
}

export enum GameState {
  LOBBY = 'LOBBY',
  GAME_START = 'GAME_START',
  TURN = 'TURN',
  PLACE = 'PLACE',
  GAME_END = 'GAME_END',
}

export enum LobbyState {
  SETTINGS_UPDATE = 'SETTINGS_UPDATE',
  PLAYER_JOIN = 'PLAYER_JOIN',
  PLAYER_LEAVE = 'PLAYER_LEAVE',
  PLAYER_KICK = 'PLAYER_KICK',
  GAME_START = 'GAME_START',
}

export interface LobbyUpdate {
  lobbyId: string,
  state: LobbyState,
  lobby: Lobby,
}

export interface GameUpdate {
  lobbyId: string,
  state: GameState,
  player: Player,
  board: Player[][],
}

export interface Lobby {
  lobbyId: string,
  rows: number,
  cols: number,
  connect: number,
  maxPlayers: number,
  admin: string,
  state: GameState,
  playerCount: number,
  currentPlayer: string,
  players: Player[],
}

export interface ChatMessage {
  lobbyId: string,
  message: string,
  player: Player,
}