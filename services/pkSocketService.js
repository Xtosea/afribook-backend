// services/pkSocketService.js

import redis from "../config/redis.js";


// ==========================================
// REDIS KEY
// ==========================================

const pkKey = (battleId) => `pk:room:${battleId}`;


// ==========================================
// GET / CREATE PK ROOM
// ==========================================

export const getPKRoom = async (battleId) => {

  if (!redis) {
    throw new Error("Redis/Valkey is not configured");
  }

  const key = pkKey(battleId);

  let room = await redis.hgetall(key);

  if (!room || Object.keys(room).length === 0) {

    room = {
      users: JSON.stringify([]),
      started: "false",
      startedAt: "",
      hostAScore: "0",
      hostBScore: "0",
    };

    await redis.hset(key, room);

    // Automatically remove abandoned rooms after 1 hour
    await redis.expire(key, 3600);
  }

  return {
    battleId,
    users: room.users
      ? JSON.parse(room.users)
      : [],

    started: room.started === "true",

    startedAt:
      room.startedAt
        ? room.startedAt
        : null,

    hostAScore:
      Number(room.hostAScore || 0),

    hostBScore:
      Number(room.hostBScore || 0),
  };
};


// ==========================================
// JOIN PK ROOM
// ==========================================

export const joinPKRoom = async (
  battleId,
  userId
) => {

  const room = await getPKRoom(battleId);

  const users = new Set(room.users);

  users.add(userId.toString());

  await redis.hset(
    pkKey(battleId),
    "users",
    JSON.stringify(
      Array.from(users)
    )
  );

  await redis.expire(
    pkKey(battleId),
    3600
  );

  return {
    ...room,

    users: Array.from(users),
  };
};


// ==========================================
// LEAVE PK ROOM
// ==========================================

export const leavePKRoom = async (
  battleId,
  userId
) => {

  if (!redis) {
    throw new Error("Redis/Valkey is not configured");
  }

  const key = pkKey(battleId);

  const exists = await redis.exists(key);

  if (!exists) {
    return null;
  }

  const room = await getPKRoom(battleId);

  const users = new Set(room.users);

  users.delete(
    userId.toString()
  );

  // If nobody is left, delete the room
  if (users.size === 0) {

    await redis.del(key);

    return null;
  }

  await redis.hset(
    key,
    "users",
    JSON.stringify(
      Array.from(users)
    )
  );

  return {
    ...room,

    users: Array.from(users),
  };
};


// ==========================================
// START PK ROOM
// ==========================================

export const startPKRoom = async (
  battleId,
  startedAt = null
) => {

  const room = await getPKRoom(
    battleId
  );

  // Preserve the existing Redis start time
  // if the room is already active.
  const existingStartedAt =
    room.startedAt;

  const finalStartedAt =
    existingStartedAt ||
    startedAt ||
    new Date().toISOString();

  await redis.hset(
    pkKey(battleId),
    {
      started: "true",
      startedAt: finalStartedAt,
    }
  );

  return {
    battleId,

    started: true,

    startedAt:
      finalStartedAt,

    hostAScore:
      room.hostAScore,

    hostBScore:
      room.hostBScore,
  };
};


// ==========================================
// GET ROOM STATE
// ==========================================

export const getPKRoomState = async (
  battleId
) => {

  if (!redis) {
    throw new Error(
      "Redis/Valkey is not configured"
    );
  }

  const exists =
    await redis.exists(
      pkKey(battleId)
    );

  if (!exists) {
    return null;
  }

  return getPKRoom(
    battleId
  );
};


// ==========================================
// UPDATE PK SCORE
// ==========================================

export const updatePKRoomScore = async (
  battleId,
  hostAScore,
  hostBScore
) => {

  if (!redis) {
    throw new Error(
      "Redis/Valkey is not configured"
    );
  }

  const room =
    await getPKRoom(
      battleId
    );

  await redis.hset(
    pkKey(battleId),
    {
      hostAScore:
        String(hostAScore),

      hostBScore:
        String(hostBScore),
    }
  );

  return {
    ...room,

    hostAScore:
      Number(hostAScore),

    hostBScore:
      Number(hostBScore),
  };
};


// ==========================================
// GET PK SCORE
// ==========================================

export const getPKRoomScore = async (
  battleId
) => {

  if (!redis) {
    throw new Error(
      "Redis/Valkey is not configured"
    );
  }

  const room =
    await getPKRoom(
      battleId
    );

  return {
    hostAScore:
      room.hostAScore,

    hostBScore:
      room.hostBScore,
  };
};