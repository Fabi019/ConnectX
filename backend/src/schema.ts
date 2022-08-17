import { gql } from 'apollo-server-core';
import { PubSub, withFilter } from 'graphql-subscriptions';

import { v4 as uuidv4 } from 'uuid';
import { nanoid } from 'nanoid';

import { Player, Lobby, GameState, GameUpdate, LobbyUpdate, LobbyState } from './types';
import { getLobbyPlayer as getLobbyPlayers, determineNextPlayer, initializeLobby, removePlayer, updateLobby, isPlayerInLobby } from './redis';
import { clearGame, getGameBoard, makeTurn, newGame } from './game';

export const typeDefs = gql`
  type Player {
    uid: String
    nickname: String
  }

  type Lobby {
    lobbyId: String
    rows: Int
    cols: Int
    connect: Int
    maxPlayers: Int
    admin: String
    playerCount: Int
    players: [Player]
  }

  type GameUpdate {
    lobbyId: String
    state: String
    player: Player
    board: [[Player]]
  }

  type ChatMessage {
    lobbyId: String
    player: Player
    message: String
  }

  type LobbyUpdate {
    lobbyId: String
    state: String
    lobby: Lobby
  }

  type Subscription {
    gameState: GameUpdate
    lobbyState: LobbyUpdate
    chatMessage: ChatMessage
  }

  type Query @rateLimit(limit: 60, duration: 60) {
    self: Player
    lobbyInfo: Lobby
    gameInfo: [[Player]]
  }

  type Mutation @rateLimit(limit: 60, duration: 60) {
    createLobby: Lobby @rateLimit(limit: 1, duration: 60)
    startGame: Boolean
    stopGame: Boolean
    leaveLobby: Boolean
    kickPlayer(uid: String!): Boolean
    joinLobby(lobbyId: String!, nickname: String!): Lobby
    updateLobby(rows: Int!, cols: Int!, maxPlayers: Int!, connect: Int!): Lobby
    makeTurn(col: Int!): Boolean
    writeChat(message: String!): Boolean
  }
`;

export const pubsub = new PubSub();

export const resolvers = {
  Subscription: {
    gameState: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['GAME_STATE']),
        (payload, args, { session }) => {
          const { lobbyId } = session;

          //console.log('Gamestate:', lobbyId, uid);

          if (!lobbyId) {
            throw new Error('You are not in a game!');
          }

          return payload.gameState.lobbyId === lobbyId;
        },
      )
    },

    lobbyState: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['LOBBY_STATE']),
        (payload, args, { session }) => {
          const { lobbyId } = session;

          //console.log('LobbyState:', lobbyId, uid);

          if (!lobbyId) {
            throw new Error('You are not in a lobby!');
          }

          return payload.lobbyState.lobbyId === lobbyId;
        },
      )
    },

    chatMessage: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['CHAT_MESSAGE']),
        (payload, args, { session }) => {
          const { lobbyId } = session;

          //console.log('ChatMessage:', lobbyId, uid);

          if (!lobbyId) {
            throw new Error('You are not in a lobby!');
          }

          return payload.chatMessage.lobbyId === lobbyId;
        },
      )
    }
  },
  Query: {
    self: (parent, args, { session }): Player => {
      const { uid, nickname } = session;

      if (!uid) {
        throw new Error('No information found! Cookies enabled?')
      }

      return {
        uid,
        nickname,
      };
    },

    lobbyInfo: async (parent, args, { session, redis }): Promise<Lobby> => {
      const { lobbyId, uid } = session;

      const inLobby = await isPlayerInLobby(lobbyId, uid, redis);
      if (!lobbyId || !inLobby) {
        session.lobbyId = null;
        throw new Error('You are not in a lobby!');
      }

      // Query lobby info
      const lobby = await redis.hGetAll(`lobby:${lobbyId}`) as Lobby;

      if (!lobby.lobbyId) {
        throw new Error('Lobby does not exist!');
      }

      lobby.players = await getLobbyPlayers(lobbyId, redis);

      return lobby;
    },

    gameInfo: async (parent, args, { session, redis }): Promise<Player[][]> => {
      const { lobbyId, uid } = session;

      const inLobby = await isPlayerInLobby(lobbyId, uid, redis);
      if (!lobbyId || !inLobby) {
        session.lobbyId = null;
        throw new Error('You are not in a lobby!');
      }

      return getGameBoard(lobbyId);
    },
  },

  Mutation: {
    writeChat: async (parent, { message }, { session }): Promise<boolean> => {
      const { lobbyId, uid, nickname } = session;

      if (!lobbyId) {
        throw new Error('You are not in a lobby!');
      }

      if (message.lenght > 30) {
        message = message.substring(0, 30);
      }

      // Filter illegal chars
      message = message.replace(/[^a-z0-9äöüß?! .,_-]/gim, '*');

      await pubsub.publish('CHAT_MESSAGE', {
        chatMessage: {
          lobbyId,
          message,
          player: {
            uid,
            nickname,
          }
        }
      })

      return true;
    },

    kickPlayer: async (parent, { uid: otherUid }, { session, redis }): Promise<boolean> => {
      const { lobbyId, uid } = session;

      if (!lobbyId) {
        throw new Error('You are not in a lobby!');
      }

      const lobby = await redis.hGetAll(`lobby:${lobbyId}`) as Lobby;

      if (lobby.admin !== uid) {
        throw new Error('Only the admin can kick other players!');
      }

      if (uid === otherUid) {
        throw new Error('You cannot kick yourself from the lobby!');
      }

      await removePlayer(lobbyId, otherUid, redis);

      const newLobby = await redis.hGetAll(`lobby:${lobbyId}`) as Lobby;
      newLobby.players = await getLobbyPlayers(lobbyId, redis);

      // Trigger lobbyState update
      await pubsub.publish('LOBBY_STATE', {
        lobbyState: {
          lobbyId,
          state: LobbyState.PLAYER_KICK,
          lobby: newLobby,
        } as LobbyUpdate
      });

      return true;
    },

    leaveLobby: async (parent, args, { session, redis }): Promise<boolean> => {
      const { lobbyId, uid } = session;

      if (!lobbyId) {
        throw new Error('You are not in a lobby!');
      }

      await removePlayer(lobbyId, uid, redis);

      session.lobbyId = null;

      const lobby = await redis.hGetAll(`lobby:${lobbyId}`) as Lobby;
      lobby.players = await getLobbyPlayers(lobbyId, redis);

      // Trigger gameState update
      await pubsub.publish('LOBBY_STATE', {
        lobbyState: {
          lobbyId,
          state: LobbyState.PLAYER_LEAVE,
          lobby,
        } as LobbyUpdate
      });

      return true;
    },

    createLobby: async (parent, args, { redis }): Promise<Lobby> => {
      const lobbyId = nanoid(11);

      return await initializeLobby(lobbyId, redis);
    },

    makeTurn: async (parent, { col }, { session, redis }): Promise<boolean> => {
      const { lobbyId, uid, nickname } = session;

      if (!lobbyId) {
        throw new Error('You are not in a lobby!');
      }

      const lobby = await redis.hGetAll(`lobby:${lobbyId}`) as Lobby;

      if (!lobby.lobbyId) {
        throw new Error('Lobby does not exist!');
      }

      if (lobby.state !== GameState.GAME_START) {
        throw new Error('Game has not been started yet!');
      }

      if (lobby.currentPlayer !== uid) {
        throw new Error('It is not your turn!');
      }

      const player = {
        uid,
        nickname,
      } as Player;

      const result = makeTurn(lobbyId, player, col);

      await pubsub.publish('GAME_STATE', {
        gameState: {
          lobbyId,
          player,
          state: GameState.PLACE,
          board: getGameBoard(lobbyId),
        } as GameUpdate
      });

      // Check if the game is won
      if (result) {
        await pubsub.publish('GAME_STATE', {
          gameState: {
            lobbyId,
            player,
            state: GameState.GAME_END,
          } as GameUpdate
        });

        await redis.hSet(`lobby:${lobbyId}`, 'state', GameState.GAME_END);
        await redis.hDel(`lobby:${lobbyId}`, 'currentPlayer');

        return true;
      }

      // Determine next player
      const nextPlayer = await determineNextPlayer(lobbyId, redis);

      // Trigger turn update
      await pubsub.publish('GAME_STATE', {
        gameState: {
          lobbyId,
          state: GameState.TURN,
          player: nextPlayer
        } as GameUpdate
      });

      return false;
    },

    startGame: async (parent, args, { session, redis }): Promise<boolean> => {
      const { lobbyId, uid } = session;

      if (!lobbyId) {
        throw new Error('You are not in a lobby!');
      }

      const lobby = await redis.hGetAll(`lobby:${lobbyId}`) as Lobby;

      if (lobby.admin !== uid) {
        throw new Error('Only the admin can start the game!');
      }

      if (lobby.state === GameState.GAME_START) {
        throw new Error('Game already started, try stopping the game first!');
      }

      // Initialize game
      newGame(lobbyId, lobby);

      // Update lobby state
      await redis.hSet(`lobby:${lobbyId}`, 'state', GameState.GAME_START);

      // Trigger GameState start game update
      await pubsub.publish('LOBBY_STATE', {
        lobbyState: {
          lobbyId,
          state: LobbyState.GAME_START
        } as LobbyUpdate
      });

      // Determine initial player
      const player = await determineNextPlayer(lobbyId, redis);

      // Trigger turn update
      // TODO: wait until all clients are in the game
      await pubsub.publish('GAME_STATE', {
        gameState: {
          lobbyId,
          state: GameState.TURN,
          player,
        } as GameUpdate
      });

      return true;
    },

    stopGame: async (parent, args, { session, redis }): Promise<boolean> => {
      const { lobbyId, uid } = session;

      if (!lobbyId) {
        throw new Error('You are not in a lobby!');
      }

      const lobby = await redis.hGetAll(`lobby:${lobbyId}`) as Lobby;

      if (lobby.admin !== uid) {
        throw new Error('Only the admin can stop the game!');
      }

      if (lobby.state !== GameState.GAME_START) {
        //throw new Error('Game is not started!');
      }

      clearGame(lobbyId);

      // Update lobby state
      await redis.hSet(`lobby:${lobbyId}`, 'state', GameState.LOBBY);

      await pubsub.publish('GAME_STATE', {
        gameState: {
          lobbyId,
          state: GameState.LOBBY,
        } as GameUpdate
      });

      return true;
    },

    joinLobby: async (parent, { lobbyId, nickname }, { session, redis }): Promise<Lobby> => {
      if (nickname.length > 15) {
        nickname = nickname.substring(0, 15);
      }

      // Query lobby info
      const lobby = await redis.hGetAll(`lobby:${lobbyId}`) as Lobby;

      if (!lobby.lobbyId) {
        throw new Error('Lobby does not exist!');
      }

      if (lobby.playerCount >= lobby.maxPlayers) {
        throw new Error('Lobby is already full!');
      }

      // Update the session values
      if (!session.uid) {
        session.uid = uuidv4();
      }
      session.lobbyId = lobbyId;
      session.nickname = nickname;

      // Check if player already is in the lobby
      const alreadyInLobby = await redis.hExists(`player:${lobbyId}`, session.uid);
      if (alreadyInLobby) {
        throw new Error('You are already in that lobby!');
      }

      // Set player as lobby admin
      if (lobby.playerCount <= 0) {
        await redis.hSet(`lobby:${lobbyId}`, 'admin', session.uid);
      }

      // Increment player count
      await redis.hIncrBy(`lobby:${lobbyId}`, 'playerCount', 1);

      // Add player to the playerlist
      await redis.hSet(`player:${lobbyId}`, session.uid, session.nickname);
      await redis.expire(`player:${lobbyId}`, 60 * 60 * 24);

      const newLobby = await redis.hGetAll(`lobby:${lobbyId}`) as Lobby;
      newLobby.players = await getLobbyPlayers(lobbyId, redis);

      // Trigger gameState update
      await pubsub.publish('LOBBY_STATE', {
        lobbyState: {
          lobbyId,
          state: LobbyState.PLAYER_JOIN,
          lobby: newLobby,
        } as LobbyUpdate
      });

      return newLobby;
    },

    updateLobby: async (parent, { rows, cols, maxPlayers, connect }, { session, redis }): Promise<Lobby> => {
      const { lobbyId, uid } = session;

      // Query lobby info
      const lobby = await redis.hGetAll(`lobby:${lobbyId}`) as Lobby;

      if (uid !== lobby.admin) {
        throw new Error('Only the admin can modify settings!');
      }

      // TODO: verify parameters
      lobby.rows = rows;
      lobby.cols = cols;
      lobby.maxPlayers = maxPlayers;
      lobby.connect = connect;

      await updateLobby(lobby, redis);
      lobby.players = await getLobbyPlayers(lobbyId, redis);

      // Trigger gameState update
      await pubsub.publish('LOBBY_STATE', {
        lobbyState: {
          lobbyId,
          state: LobbyState.SETTINGS_UPDATE,
          lobby,
        } as LobbyUpdate
      });

      return lobby;
    }
  }
};