// services/pkSocketService.js

const pkRooms = new Map();

/*
  Structure:

  pkRooms = Map {
    battleId => {
      users: Set(),
      started: false,
      startedAt: null
    }
  }
*/


// ==========================================
// GET / CREATE PK ROOM
// ==========================================

export const getPKRoom = (battleId) => {
  if (!pkRooms.has(battleId)) {
    pkRooms.set(battleId, {
      users: new Set(),
      started: false,
      startedAt: null,
    });
  }

  return pkRooms.get(battleId);
};


// ==========================================
// JOIN PK ROOM
// ==========================================

export const joinPKRoom = (
  battleId,
  userId
) => {
  const room = getPKRoom(battleId);

  room.users.add(userId);

  return {
    battleId,
    users: Array.from(room.users),
    started: room.started,
    startedAt: room.startedAt,
  };
};


// ==========================================
// LEAVE PK ROOM
// ==========================================

export const leavePKRoom = (
  battleId,
  userId
) => {
  const room = pkRooms.get(battleId);

  if (!room) {
    return null;
  }

  room.users.delete(userId);

  if (room.users.size === 0) {
    pkRooms.delete(battleId);
    return null;
  }

  return {
    battleId,
    users: Array.from(room.users),
    started: room.started,
    startedAt: room.startedAt,
  };
};


// ==========================================
// START PK ROOM
// ==========================================

export const startPKRoom = (
  battleId
) => {
  const room = getPKRoom(battleId);

  room.started = true;
  room.startedAt = new Date();

  return {
    battleId,
    started: true,
    startedAt: room.startedAt,
  };
};


// ==========================================
// GET ROOM
// ==========================================

export const getPKRoomState = (
  battleId
) => {
  const room = pkRooms.get(battleId);

  if (!room) {
    return null;
  }

  return {
    battleId,
    users: Array.from(room.users),
    started: room.started,
    startedAt: room.startedAt,
  };
};


// ==========================================
// UPDATE PK SCORE IN SOCKET ROOM
// ==========================================

export const updatePKRoomScore = (
  battleId,
  hostAScore,
  hostBScore
) => {
  const room = getPKRoom(battleId);

  room.hostAScore = hostAScore;
  room.hostBScore = hostBScore;

  return {
    battleId,
    users: Array.from(room.users),
    started: room.started,
    startedAt: room.startedAt,
    hostAScore: room.hostAScore,
    hostBScore: room.hostBScore,
  };
};


// ==========================================
// GET PK SCORE
// ==========================================

export const getPKRoomScore = (
  battleId
) => {
  const room = pkRooms.get(battleId);

  if (!room) {
    return null;
  }

  return {
    hostAScore: room.hostAScore || 0,
    hostBScore: room.hostBScore || 0,
  };
};