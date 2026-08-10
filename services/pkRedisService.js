// services/pkRedisService.js

import redis from "./redis.js";

// ==========================================
// CONFIGURATION
// ==========================================

// Pending/abandoned PK room:
// 1 hour
const PENDING_TTL = 60 * 60;

// Active PK room:
// 30 minutes
//
// Your current PK duration is 5 minutes,
// but 30 minutes gives enough room for
// reconnects/network problems.
const ACTIVE_TTL = 30 * 60;


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
// REFRESH ROOM TTL
// ==========================================

export const refreshPKRoomTTL = async (
  battleId,
  active = false
) => {

  const client =
    requireRedis();

  const ttl =
    active
      ? ACTIVE_TTL
      : PENDING_TTL;

  await client.expire(
    pkKey(battleId),
    ttl
  );
};


// ==========================================
// GET / CREATE PK ROOM
// ==========================================

export const getPKRoom = async (
  battleId
) => {

  const client =
    requireRedis();

  const key =
    pkKey(battleId);

  const existing =
    await client.hgetall(key);

  // ------------------------------------------
  // Create new room
  // ------------------------------------------

  if (
    !existing ||
    Object.keys(existing).length === 0
  ) {

    await client.hset(
      key,
      {
        users:
          JSON.stringify([]),

        started:
          "false",

        startedAt:
          "",

        hostAScore:
          "0",

        hostBScore:
          "0",
      }
    );

    await client.expire(
      key,
      PENDING_TTL
    );

    return {
      battleId,
      users: [],
      started: false,
      startedAt: null,
      hostAScore: 0,
      hostBScore: 0,
    };
  }

  // ------------------------------------------
  // Return existing room
  // ------------------------------------------

  return {

    battleId,

    users:
      existing.users
        ? JSON.parse(existing.users)
        : [],

    started:
      existing.started === "true",

    startedAt:
      existing.startedAt
        ? existing.startedAt
        : null,

    hostAScore:
      Number(
        existing.hostAScore || 0
      ),

    hostBScore:
      Number(
        existing.hostBScore || 0
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

  const client =
    requireRedis();

  const room =
    await getPKRoom(
      battleId
    );

  const users =
    Array.isArray(room.users)
      ? room.users
      : [];

  const id =
    userId.toString();

  if (
    !users.includes(id)
  ) {

    users.push(id);
  }

  await client.hset(
    pkKey(battleId),
    {
      users:
        JSON.stringify(users),
    }
  );

  // Keep room alive.
  await refreshPKRoomTTL(
    battleId,
    room.started
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

  const client =
    requireRedis();

  const room =
    await getPKRoom(
      battleId
    );

  const id =
    userId.toString();

  const users =
    room.users.filter(
      (user) => user !== id
    );

  await client.hset(
    pkKey(battleId),
    {
      users:
        JSON.stringify(users),
    }
  );

  // ------------------------------------------
  // IMPORTANT:
  //
  // We DON'T delete the room.
  //
  // Redis TTL will clean it up automatically.
  // ------------------------------------------

  await refreshPKRoomTTL(
    battleId,
    room.started
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

  const client =
    requireRedis();

  const room =
    await getPKRoom(
      battleId
    );

  const date =
    startedAt instanceof Date
      ? startedAt
      : new Date(startedAt);

  await client.hset(
    pkKey(battleId),
    {
      started:
        "true",

      startedAt:
        date.toISOString(),
    }
  );

  // Active PK gets active TTL.
  await refreshPKRoomTTL(
    battleId,
    true
  );

  return {
    ...room,

    started:
      true,

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

  const client =
    requireRedis();

  const key =
    pkKey(battleId);

  const exists =
    await client.exists(key);

  if (!exists) {
    return null;
  }

  return await getPKRoom(
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

  const client =
    requireRedis();

  const room =
    await getPKRoom(
      battleId
    );

  await client.hset(
    pkKey(battleId),
    {
      hostAScore:
        String(hostAScore),

      hostBScore:
        String(hostBScore),
    }
  );

  // Score activity means the PK is alive.
  await refreshPKRoomTTL(
    battleId,
    room.started
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

  const client =
    requireRedis();

  const data =
    await client.hmget(
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
// COMPLETE / DELETE PK ROOM
// ==========================================

export const deletePKRoom = async (
  battleId
) => {

  const client =
    requireRedis();

  await client.del(
    pkKey(battleId)
  );

  console.log(
    `🧹 Redis PK room deleted: ${battleId}`
  );
};


// ==========================================
// GET REMAINING TTL
// ==========================================

export const getPKRoomTTL = async (
  battleId
) => {

  const client =
    requireRedis();

  return await client.ttl(
    pkKey(battleId)
  );
};