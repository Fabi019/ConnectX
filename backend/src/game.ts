import { Lobby, Player } from './types';

const games = new Map<string, Game>;

export function newGame(lobbyId: string, lobby: Lobby) {
  const game = new Game(lobby);
  games.set(lobbyId, game);
}

export function clearGame(lobbyId: string): boolean {
  return games.delete(lobbyId);
}

export function makeTurn(lobbyId: string, player: Player, col: number): boolean {
  if (!games.has(lobbyId)) {
    throw new Error('Game not found, try starting it again!');
  }
  const result = games.get(lobbyId).makeTurn(player, col);
  return result;
}

export function getGameBoard(lobbyId: string): Player[][] {
  if (!games.has(lobbyId)) {
    throw new Error('Game not found!');
  }
  return games.get(lobbyId).getBoard();
}

class Game {
  private rows: number;
  private cols: number;
  private connect: number;

  // cols -> rows
  private board: Player[][];

  constructor(lobby: Lobby) {
    this.rows = lobby.rows;
    this.cols = lobby.cols;
    this.connect = lobby.connect;
    this.board = [];
  }

  getBoard(): Player[][] {
    return this.board;
  }

  makeTurn(player: Player, col: number): boolean {
    if (col < 0 || col > this.cols) {
      throw new Error('Column out of bounds!')
    }

    const boardCol = this.board[col] || [];

    if (boardCol.length >= this.rows) {
      throw new Error('Row already full!');
    }

    boardCol.push(player);

    this.board[col] = boardCol;

    return this.hasWon(player, col, boardCol.length - 1);
  }

  hasWon(player: Player, col: number, row: number): boolean {
    const horizontal = 1 +
      this.count(player, col - 1, row, [-1, 0]) +
      this.count(player, col + 1, row, [1, 0]);
    if (horizontal >= this.connect) {
      return true;
    }

    const vertical = 1 +
      this.count(player, col, row - 1, [0, -1]);
    if (vertical >= this.connect) {
      return true;
    }

    const diagUD = 1 +
      this.count(player, col - 1, row + 1, [-1, 1]) +
      this.count(player, col + 1, row - 1, [1, -1]);
    if (diagUD >= this.connect) {
      return true;
    }

    const diagDU = 1 +
      this.count(player, col - 1, row - 1, [-1, -1]) +
      this.count(player, col + 1, row + 1, [1, 1]);
    if (diagDU >= this.connect) {
      return true;
    }

    return false;
  }

  count(player: Player, col: number, row: number, direction: number[]) {
    const [xOff, yOff] = direction;

    let count = 0;
    let current: Player;
    while (this.board[col] && this.board[col][row]) {
      current = this.board[col][row];
      if (current && current.uid === player.uid) {
        count++;
        col += xOff;
        row += yOff;
      } else {
        break;
      }
    }

    return count;
  }
}