// services/pkRedisService.js

import redis from "./redis.js";

// ==========================================
// REDIS KEY
// ==========================================

const pkKey = (battleId) =>
  `pk:room:${battleId}`;


// ==========================================
// GET / CREATE PK ROOM
// ==========================================

export const getPKRoom = async (battleId) => {
  if (!redis) {
    throw new Error("Redis/Valkey is not configured");
  }

  const key = pkKey(battleId);

  const existing = await redis.hgetall(key);

  if (!existing || Object.keys(existing).length === 0) {
    await redis.hset(key, {
      users: JSON.stringify([]),
      started: "false",
      startedAt: "",
      hostAScore: "0",
      hostBScore: "0",
    });

    return {
      battleId,
      users: [],
      started: false,
      startedAt: null,
      hostAScore: 0,
      hostBScore: 0,
    };
  }

  return {
    battleId,

    users: existing.users
      ? JSON.parse(existing.users)
      : [],

    started:
      existing.started === "true",

    startedAt:
      existing.startedAt
        ? existing.startedAt
        : null,

    hostAScore:
      Number(existing.hostAScore || 0),

    hostBScore:
      Number(existing.hostBScore || 0),
  };
};


// ==========================================
// JOIN PK ROOM
// ==========================================

export const joinPKRoom = async (
  battleId,
  userId
) => {

  const room =
    await getPKRoom(battleId);

  const users =
    Array.isArray(room.users)
      ? room.users
      : [];

  const id =
    userId.toString();

  if (!users.includes(id)) {
    users.push(id);
  }

  await redis.hset(
    pkKey(battleId),
    {
      users: JSON.stringify(users),
    }
  );

  return {
    ...room,
    users,
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

  const room =
    await getPKRoom(battleId);

  const id =
    userId.toString();

  const users =
    room.users.filter(
      (user) => user !== id
    );

  // Keep room alive even if everyone
  // temporarily disconnects.
  //
  // This is important for reconnects.
  await redis.hset(
    pkKey(battleId),
    {
      users: JSON.stringify(users),
    }
  );

  return {
    ...room,
    users,
  };
};


// ==========================================
// START PK ROOM
// ==========================================

export const startPKRoom = async (
  battleId,
  startedAt = new Date()
) => {

  const room =
    await getPKRoom(battleId);

  const date =
    startedAt instanceof Date
      ? startedAt
      : new Date(startedAt);

  await redis.hset(
    pkKey(battleId),
    {
      started: "true",
      startedAt: date.toISOString(),
    }
  );

  return {
    ...room,

    started: true,

    startedAt:
      date.toISOString(),
  };
};


// ==========================================
// GET PK ROOM STATE
// ==========================================

export const getPKRoomState = async (
  battleId
) => {

  if (!redis) {
    throw new Error("Redis/Valkey is not configured");
  }

  const key =
    pkKey(battleId);

  const exists =
    await redis.exists(key);

  if (!exists) {
    return null;
  }

  return await getPKRoom(battleId);
};


// ==========================================
// UPDATE PK SCORE
// ==========================================

export const updatePKRoomScore = async (
  battleId,
  hostAScore,
  hostBScore
) => {

  const room =
    await getPKRoom(battleId);

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
    throw new Error("Redis/Valkey is not configured");
  }

  const data =
    await redis.hmget(
      pkKey(battleId),
      "hostAScore",
      "hostBScore"
    );

  return {
    hostAScore:
      Number(data[0] || 0),

    hostBScore:
      Number(data[1] || 0),
  };
};


// ==========================================
// DELETE PK ROOM
// ==========================================

export const deletePKRoom = async (
  battleId
) => {

  if (!redis) {
    throw new Error("Redis/Valkey is not configured");
  }

  await redis.del(
    pkKey(battleId)
  );
};