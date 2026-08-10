// services/pkSocketService.js

import redis from "../config/redis.js";

// ==========================================
// CONFIGURATION
// ==========================================

const ROOM_TTL = 30 * 60; // 30 minutes

// ==========================================
// REDIS KEY
// ==========================================

const pkKey = (battleId) =>
  `pk:room:${battleId}`;

// ==========================================
// REDIS CHECK
// ==========================================

const requireRedis = () => {
  if (!redis) {
    throw new Error(
      "Redis/Valkey is not configured"
    );
  }

  return redis;
};

// ==========================================
// GET / CREATE PK ROOM
// ==========================================

export const getPKRoom = async (battleId) => {
  const client = requireRedis();

  const key = pkKey(battleId);

  let room = await client.hgetall(key);

  // ----------------------------------------
  // Create room if missing
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

    await client.hset(key, room);

    await client.expire(
      key,
      ROOM_TTL
    );
  }

  // ----------------------------------------
  // Parse users safely
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
      room.startedAt || null,

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
  const client = requireRedis();

  const room =
    await getPKRoom(battleId);

  const users =
    new Set(room.users);

  users.add(
    userId.toString()
  );

  await client.hset(
    pkKey(battleId),
    "users",
    JSON.stringify(
      Array.from(users)
    )
  );

  await client.expire(
    pkKey(battleId),
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
  const client = requireRedis();

  const key =
    pkKey(battleId);

  const exists =
    await client.exists(key);

  if (!exists) {
    return null;
  }

  const room =
    await getPKRoom(battleId);

  const users =
    room.users.filter(
      (id) =>
        id !== userId.toString()
    );

  await client.hset(
    key,
    "users",
    JSON.stringify(users)
  );

  await client.expire(
    key,
    ROOM_TTL
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
  const client = requireRedis();

  const room =
    await getPKRoom(battleId);

  const date =
    startedAt instanceof Date
      ? startedAt
      : new Date(startedAt);

  await client.hset(
    pkKey(battleId),
    {
      started: "true",

      startedAt:
        date.toISOString(),
    }
  );

  await client.expire(
    pkKey(battleId),
    ROOM_TTL
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
  const client = requireRedis();

  const key =
    pkKey(battleId);

  const exists =
    await client.exists(key);

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
  const client = requireRedis();

  const key =
    pkKey(battleId);

  // Make sure room exists
  const room =
    await getPKRoom(
      battleId
    );

  const scoreA =
    Number(hostAScore);

  const scoreB =
    Number(hostBScore);

  if (
    !Number.isFinite(scoreA) ||
    !Number.isFinite(scoreB)
  ) {
    throw new Error(
      "Invalid PK scores"
    );
  }

  await client.hset(
    key,
    {
      hostAScore:
        String(scoreA),

      hostBScore:
        String(scoreB),
    }
  );

  await client.expire(
    key,
    ROOM_TTL
  );

  return {
    ...room,

    hostAScore:
      scoreA,

    hostBScore:
      scoreB,
  };
};

// ==========================================
// ATOMICALLY ADD PK SCORE
// ==========================================

export const addPKRoomScore = async (
  battleId,
  isHostA,
  points
) => {
  const client = requireRedis();

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

  const key =
    pkKey(battleId);

  // Make sure room exists
  await getPKRoom(
    battleId
  );

  const scoreField =
    isHostA
      ? "hostAScore"
      : "hostBScore";

  // ----------------------------------------
  // Atomic Redis increment
  // ----------------------------------------

  await client.hincrby(
    key,
    scoreField,
    numericPoints
  );

  // Keep room alive
  await client.expire(
    key,
    ROOM_TTL
  );

  // Read final state
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
// RESET / DELETE PK ROOM
// ==========================================

export const resetPKRoom = async (
  battleId
) => {
  const client = requireRedis();

  await client.del(
    pkKey(battleId)
  );

  console.log(
    `🧹 Redis PK room deleted: ${battleId}`
  );
};