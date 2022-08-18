import { createClient } from 'redis';
import { GameState, Lobby, Player } from './types';

export type RedisClient = ReturnType<typeof createClient>;

export async function createRedisConnection(): Promise<RedisClient> {
  const redisClient = createClient({
    url: `redis://${process.env.REDIS_URL || 'localhost'}:6379`,
    legacyMode: true,
  });

  redisClient.on('connect', () => {
    console.log('CacheStore - Connection status: ready');
  });
  redisClient.on('connect', () => {
    console.log('CacheStore - Connection status: connected');
  });
  redisClient.on('end', () => {
    console.log('CacheStore - Connection status: disconnected');
  });
  redisClient.on('reconnecting', () => {
    console.log('CacheStore - Connection status: reconnecting');
  });
  redisClient.on('error', (err) => {
    console.log('CacheStore - Connection status: error ', { err });
  });

  await redisClient.connect();

  return redisClient;
}

export async function initializeLobby(
  lobbyId: string,
  redis: RedisClient,
  maxPlayers = 4,
  playerCount = 0,
  rows = 15,
  cols = 15,
  connect = 4,
  state = GameState.LOBBY
): Promise<Lobby> {
  await redis.hSet(`lobby:${lobbyId}`, 'lobbyId', lobbyId);
  await redis.hSet(`lobby:${lobbyId}`, 'maxPlayers', maxPlayers);
  await redis.hSet(`lobby:${lobbyId}`, 'playerCount', playerCount);
  await redis.hSet(`lobby:${lobbyId}`, 'rows', rows);
  await redis.hSet(`lobby:${lobbyId}`, 'cols', cols);
  await redis.hSet(`lobby:${lobbyId}`, 'connect', connect);
  await redis.hSet(`lobby:${lobbyId}`, 'state', state);

  await redis.expire(`lobby:${lobbyId}`, 60 * 60 * 24 * 3);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return await redis.hGetAll(`lobby:${lobbyId}`) as Lobby;
}

export async function updateLobby(lobby: Lobby, redis: RedisClient): Promise<void> {
  await initializeLobby(
    lobby.lobbyId,
    redis,
    lobby.maxPlayers,
    lobby.playerCount,
    lobby.rows,
    lobby.cols,
    lobby.connect
  );
}

export async function getLobbyPlayer(lobbyId: string, redis: RedisClient): Promise<Player[]> {
  const players = await redis.hGetAll(`player:${lobbyId}`);

  const playerList: Player[] = [];
  for (const uid of Object.keys(players)) {
    playerList.push({
      uid,
      nickname: players[uid],
    });
  }

  return playerList;
}

export async function determineNextPlayer(lobbyId: string, redis: RedisClient): Promise<Player> {
  const lobbyPlayer = await getLobbyPlayer(lobbyId, redis);
  const currentPlayerId = await redis.hGet(`lobby:${lobbyId}`, 'currentPlayer');

  let nextPlayer;

  if (currentPlayerId) {
    const currentIndex = lobbyPlayer.findIndex((player) => player.uid === currentPlayerId);
    const nextIndex = (currentIndex + 1) % lobbyPlayer.length;
    nextPlayer = lobbyPlayer[nextIndex];
  } else {
    nextPlayer = lobbyPlayer[0];
  }

  // Update current player
  await redis.hSet(`lobby:${lobbyId}`, 'currentPlayer', nextPlayer.uid);

  return nextPlayer;
}

export async function removePlayerFromLobby(lobbyId: string, uid: string, redis: RedisClient): Promise<void> {
  // Decrement player count
  await redis.hIncrBy(`lobby:${lobbyId}`, 'playerCount', -1);

  // Remove player from player list
  await redis.hDel(`player:${lobbyId}`, uid);

  const admin = await redis.hGet(`lobby:${lobbyId}`, 'admin');
  if (uid === admin) {
    const lobbyPlayers = await getLobbyPlayer(lobbyId, redis);
    if (lobbyPlayers.length >= 1) {
      await redis.hSet(`lobby:${lobbyId}`, 'admin', lobbyPlayers[0].uid);
    }
  }

  return;
}

export async function isPlayerInLobby(lobbyId: string, uid: string, redis: RedisClient): Promise<boolean> {
  return await redis.hExists(`player:${lobbyId}`, uid);
}