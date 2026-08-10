// services/pkSocketService.js

import redis from "../config/redis.js";


// ==========================================
// CONFIGURATION
// ==========================================

const PENDING_TTL = 60 * 60;       // 1 hour
const ACTIVE_TTL = 30 * 60;        // 30 minutes


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
// REFRESH TTL
// ==========================================

export const refreshPKRoomTTL = async (
  battleId,
  active = false
) => {

  const client =
    requireRedis();

  await client.expire(
    pkKey(battleId),
    active
      ? ACTIVE_TTL
      : PENDING_TTL
  );
};


// ==========================================
// GET / CREATE ROOM
// ==========================================

export const getPKRoom = async (
  battleId
) => {

  const client =
    requireRedis();

  const key =
    pkKey(battleId);

  let room =
    await client.hgetall(key);


  // ------------------------------------------
  // Create room if missing
  // ------------------------------------------

  if (
    !room ||
    Object.keys(room).length === 0
  ) {

    room = {
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
    };

    await client.hset(
      key,
      room
    );

    await client.expire(
      key,
      PENDING_TTL
    );
  }


  // ------------------------------------------
  // Parse users safely
  // ------------------------------------------

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


  // ------------------------------------------
  // Return normalized state
  // ------------------------------------------

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
// JOIN ROOM
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

  const id =
    userId.toString();

  const users =
    new Set(
      room.users
        .map((user) =>
          user.toString()
        )
    );

  users.add(id);


  await client.hset(
    pkKey(battleId),
    {
      users:
        JSON.stringify(
          Array.from(users)
        ),
    }
  );


  await refreshPKRoomTTL(
    battleId,
    room.started
  );


  return {

    ...room,

    users:
      Array.from(users),

  };
};


// ==========================================
// LEAVE ROOM
// ==========================================

export const leavePKRoom = async (
  battleId,
  userId
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


  const room =
    await getPKRoom(
      battleId
    );

  const id =
    userId.toString();


  const users =
    room.users.filter(
      (user) =>
        user.toString() !== id
    );


  await client.hset(
    key,
    {
      users:
        JSON.stringify(users),
    }
  );


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
// START REDIS PK
// ==========================================

export const startPKRoom = async (
  battleId,
  startedAt = null
) => {

  const client =
    requireRedis();

  const room =
    await getPKRoom(
      battleId
    );


  const finalStartedAt =
    room.startedAt ||
    (
      startedAt
        ? new Date(startedAt).toISOString()
        : new Date().toISOString()
    );


  await client.hset(
    pkKey(battleId),
    {
      started:
        "true",

      startedAt:
        finalStartedAt,
    }
  );


  await refreshPKRoomTTL(
    battleId,
    true
  );


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

  const client =
    requireRedis();

  const exists =
    await client.exists(
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
// SET SCORE
//
// Used when synchronizing MongoDB → Redis.
// ==========================================

export const updatePKRoomScore = async (
  battleId,
  hostAScore,
  hostBScore
) => {

  const client =
    requireRedis();

  await getPKRoom(
    battleId
  );


  const safeA =
    Math.max(
      0,
      Number(hostAScore) || 0
    );

  const safeB =
    Math.max(
      0,
      Number(hostBScore) || 0
    );


  await client.hset(
    pkKey(battleId),
    {
      hostAScore:
        String(safeA),

      hostBScore:
        String(safeB),
    }
  );


  const room =
    await getPKRoom(
      battleId
    );


  await refreshPKRoomTTL(
    battleId,
    room.started
  );


  return room;
};


// ==========================================
// ATOMICALLY ADD SCORE
// ==========================================

export const addPKRoomScore = async (
  battleId,
  isHostA,
  points
) => {

  const client =
    requireRedis();

  const numericPoints =
    Number(points);


  if (
    !Number.isFinite(
      numericPoints
    ) ||
    numericPoints <= 0
  ) {

    throw new Error(
      "Invalid score points"
    );
  }


  if (
    !Number.isSafeInteger(
      numericPoints
    )
  ) {

    throw new Error(
      "Score points must be a whole number"
    );
  }


  // ------------------------------------------
  // Make sure room exists
  // ------------------------------------------

  await getPKRoom(
    battleId
  );


  // ------------------------------------------
  // Determine score field
  // ------------------------------------------

  const scoreField =
    isHostA
      ? "hostAScore"
      : "hostBScore";


  // ------------------------------------------
  // ATOMIC REDIS INCREMENT
  // ------------------------------------------

  await client.hincrby(
    pkKey(battleId),
    scoreField,
    numericPoints
  );


  // ------------------------------------------
  // Refresh active room
  // ------------------------------------------

  await refreshPKRoomTTL(
    battleId,
    true
  );


  // ------------------------------------------
  // Read final state
  // ------------------------------------------

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
// GET SCORE
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
// DELETE ROOM
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
// RESET ROOM
// ==========================================
//
// Kept as an alias so older code doesn't
// break if it still imports resetPKRoom.
//

export const resetPKRoom =
  deletePKRoom;


// ==========================================
// GET TTL
// ==========================================

export const getPKRoomTTL = async (
  battleId
) => {

  const client =
    requireRedis();

  return client.ttl(
    pkKey(battleId)
  );
};