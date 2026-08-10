// services/pkSocketService.js

import redis from "../config/redis.js";

// ==========================================
// REDIS KEY
// ==========================================

const pkKey = (battleId) =>
  `pk:room:${battleId}`;

const ROOM_TTL = 3600; // 1 hour


// ==========================================
// GET / CREATE PK ROOM
// ==========================================

export const getPKRoom = async (battleId) => {

  if (!redis) {
    throw new Error(
      "Redis/Valkey is not configured"
    );
  }

  const key = pkKey(battleId);

  let room =
    await redis.hgetall(key);

  // ----------------------------------------
  // Create room if it doesn't exist
  // ----------------------------------------

  if (
    !room ||
    Object.keys(room).length === 0
  ) {

    room = {
      users: JSON.stringify([]),
      started: "false",
      startedAt: "",
      hostAScore: "0",
      hostBScore: "0",
    };

    await redis.hset(
      key,
      room
    );

    await redis.expire(
      key,
      ROOM_TTL
    );
  }

  // ----------------------------------------
  // Safely parse users
  // ----------------------------------------

  let users = [];

  try {

    users = room.users
      ? JSON.parse(room.users)
      : [];

    if (!Array.isArray(users)) {
      users = [];
    }

  } catch {

    users = [];
  }

  // ----------------------------------------
  // Return normalized state
  // ----------------------------------------

  return {

    battleId,

    users,

    started:
      room.started === "true",

    startedAt:
      room.startedAt ||
      null,

    hostAScore:
      Number(
        room.hostAScore || 0
      ),

    hostBScore:
      Number(
        room.hostBScore || 0
      ),
  };
};


// ==========================================
// JOIN PK ROOM
// ==========================================

export const joinPKRoom = async (
  battleId,
  userId
) => {

  if (!redis) {
    throw new Error(
      "Redis/Valkey is not configured"
    );
  }

  const key = pkKey(battleId);

  const room =
    await getPKRoom(battleId);

  const users =
    new Set(room.users);

  users.add(
    userId.toString()
  );

  await redis.hset(
    key,
    "users",
    JSON.stringify(
      Array.from(users)
    )
  );

  // Refresh TTL whenever somebody joins
  await redis.expire(
    key,
    ROOM_TTL
  );

  return {
    ...room,

    users:
      Array.from(users),
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
    throw new Error(
      "Redis/Valkey is not configured"
    );
  }

  const key = pkKey(battleId);

  const exists =
    await redis.exists(key);

  if (!exists) {
    return null;
  }

  const room =
    await getPKRoom(battleId);

  const users =
    new Set(room.users);

  users.delete(
    userId.toString()
  );

  // ----------------------------------------
  // Nobody left
  // ----------------------------------------

  if (users.size === 0) {

    await redis.del(key);

    return null;
  }

  // ----------------------------------------
  // Save remaining users
  // ----------------------------------------

  await redis.hset(
    key,
    "users",
    JSON.stringify(
      Array.from(users)
    )
  );

  await redis.expire(
    key,
    ROOM_TTL
  );

  return {
    ...room,

    users:
      Array.from(users),
  };
};


// ==========================================
// START PK ROOM
// ==========================================

export const startPKRoom = async (
  battleId,
  startedAt = null
) => {

  if (!redis) {
    throw new Error(
      "Redis/Valkey is not configured"
    );
  }

  const key = pkKey(battleId);

  const room =
    await getPKRoom(battleId);

  // ----------------------------------------
  // Preserve existing start time
  // ----------------------------------------

  const finalStartedAt =
    room.startedAt ||
    startedAt ||
    new Date().toISOString();

  // ----------------------------------------
  // Mark Redis room active
  // ----------------------------------------

  await redis.hset(
    key,
    {
      started: "true",

      startedAt:
        new Date(finalStartedAt)
          .toISOString(),
    }
  );

  // Refresh room lifetime
  await redis.expire(
    key,
    ROOM_TTL
  );

  // ----------------------------------------
  // Return complete Redis state
  // ----------------------------------------

  return getPKRoomState(
    battleId
  );
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

  const key =
    pkKey(battleId);

  // ----------------------------------------
  // Make sure room exists
  // ----------------------------------------

  await getPKRoom(
    battleId
  );

  // ----------------------------------------
  // Update scores
  // ----------------------------------------

  await redis.hset(
    key,
    {
      hostAScore:
        String(
          Number(hostAScore) || 0
        ),

      hostBScore:
        String(
          Number(hostBScore) || 0
        ),
    }
  );

  // Refresh TTL while PK is being used
  await redis.expire(
    key,
    ROOM_TTL
  );

  // ----------------------------------------
  // Return complete state
  // ----------------------------------------

  return getPKRoomState(
    battleId
  );
};


// ==========================================
// ATOMICALLY ADD PK SCORE
// ==========================================

export const addPKRoomScore = async (
  battleId,
  isHostA,
  points
) => {

  if (!redis) {
    throw new Error(
      "Redis/Valkey is not configured"
    );
  }

  const key =
    pkKey(battleId);

  const numericPoints =
    Number(points);

  if (
    !Number.isFinite(numericPoints) ||
    numericPoints <= 0
  ) {
    throw new Error(
      "Invalid score points"
    );
  }

  // ----------------------------------------
  // Make sure room exists
  // ----------------------------------------

  await getPKRoom(
    battleId
  );

  // ----------------------------------------
  // Atomically increment correct host
  // ----------------------------------------

  const scoreField =
    isHostA
      ? "hostAScore"
      : "hostBScore";

  await redis.hincrby(
    key,
    scoreField,
    numericPoints
  );

  // ----------------------------------------
  // Keep room alive
  // ----------------------------------------

  await redis.expire(
    key,
    ROOM_TTL
  );

  // ----------------------------------------
  // Read final atomic state
  // ----------------------------------------

  const room =
    await getPKRoom(
      battleId
    );

  return {
    battleId,

    hostAScore:
      room.hostAScore,

    hostBScore:
      room.hostBScore,
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


// ==========================================
// RESET PK ROOM
// ==========================================

export const resetPKRoom = async (
  battleId
) => {

  if (!redis) {
    throw new Error(
      "Redis/Valkey is not configured"
    );
  }

  await redis.del(
    pkKey(battleId)
  );

  console.log(
    `🧹 Redis PK room deleted: ${battleId}`
  );
};