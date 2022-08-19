export type Player = {
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

export type LobbyUpdate = {
  lobbyId: string,
  state: LobbyState,
  lobby: Lobby,
}

export type GameUpdate = {
  lobbyId: string,
  state: GameState,
  player: Player,
  board: Player[][],
}

export type Lobby = {
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

export type ChatMessage = {
  lobbyId: string,
  message: string,
  player: Player,
}