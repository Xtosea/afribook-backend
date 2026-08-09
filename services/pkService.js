// services/pkService.js

import PKBattle from "../models/PKBattle.js";

/*
 * AfricSocial PK Service
 *
 * Responsibilities:
 * - Create PK battles
 * - Start battles
 * - Add scores
 * - Finish battles
 * - Determine the winner
 *
 * Live state will later be moved to Redis/Valkey.
 * MongoDB is used here for permanent PK records.
 */

// ===============================
// CREATE PK
// ===============================

export const createPK = async (hostA, hostB, duration = 300) => {
  if (!hostA || !hostB) {
    throw new Error("Both PK hosts are required");
  }

  if (hostA.toString() === hostB.toString()) {
    throw new Error("A user cannot battle themselves");
  }

  const existingPK = await PKBattle.findOne({
    status: { $in: ["pending", "active"] },
    $or: [
      { hostA },
      { hostB },
      { hostA: hostB },
      { hostB: hostA },
    ],
  });

  if (existingPK) {
    throw new Error("One of the users is already in a PK");
  }

  const battle = await PKBattle.create({
    hostA,
    hostB,
    duration,
    status: "pending",
  });

  return battle;
};


// ===============================
// START PK
// ===============================

export const startPK = async (battleId) => {
  const battle = await PKBattle.findById(battleId);

  if (!battle) {
    throw new Error("PK battle not found");
  }

  if (battle.status !== "pending") {
    throw new Error("PK cannot be started");
  }

  battle.status = "active";
  battle.startedAt = new Date();

  await battle.save();

  return battle;
};


// ===============================
// ADD SCORE
// ===============================

export const addPKScore = async (
  battleId,
  userId,
  points
) => {
  if (!battleId || !userId) {
    throw new Error("Battle ID and user ID are required");
  }

  const numericPoints = Number(points);

  if (
    !Number.isFinite(numericPoints) ||
    numericPoints <= 0
  ) {
    throw new Error("Invalid PK points");
  }

  const battle = await PKBattle.findById(battleId);

  if (!battle) {
    throw new Error("PK battle not found");
  }

  if (battle.status !== "active") {
    throw new Error("PK is not active");
  }

  if (battle.hostA.toString() === userId.toString()) {
    battle.hostAScore += numericPoints;
  } else if (
    battle.hostB.toString() === userId.toString()
  ) {
    battle.hostBScore += numericPoints;
  } else {
    throw new Error("User is not part of this PK");
  }

  await battle.save();

  return {
    battle,
    hostAScore: battle.hostAScore,
    hostBScore: battle.hostBScore,
  };
};


// ===============================
// FINISH PK
// ===============================

export const finishPK = async (battleId) => {
  const battle = await PKBattle.findById(battleId);

  if (!battle) {
    throw new Error("PK battle not found");
  }

  if (battle.status !== "active") {
    throw new Error("PK is not active");
  }

  battle.status = "completed";
  battle.endedAt = new Date();

  // Determine winner
  if (battle.hostAScore > battle.hostBScore) {
    battle.winner = battle.hostA;
  } else if (battle.hostBScore > battle.hostAScore) {
    battle.winner = battle.hostB;
  } else {
    // Draw
    battle.winner = null;
  }

  await battle.save();

  return battle;
};


// ===============================
// GET PK
// ===============================

export const getPK = async (battleId) => {
  const battle = await PKBattle.findById(battleId)
    .populate("hostA", "name username profilePic")
    .populate("hostB", "name username profilePic")
    .populate("winner", "name username profilePic");

  if (!battle) {
    throw new Error("PK battle not found");
  }

  return battle;
};