// services/pkService.js

import PKBattle from "../models/PKBattle.js";


// ==========================================
// CREATE PK
// ==========================================

export const createPK = async (
  hostA,
  hostB,
  duration = 300
) => {
  if (!hostA || !hostB) {
    throw new Error("Both PK hosts are required");
  }

  if (hostA.toString() === hostB.toString()) {
    throw new Error("A user cannot battle themselves");
  }

  const safeDuration = Number(duration);

  if (
    !Number.isFinite(safeDuration) ||
    safeDuration < 30 ||
    safeDuration > 3600
  ) {
    throw new Error(
      "PK duration must be between 30 seconds and 1 hour"
    );
  }

  const existingPK = await PKBattle.findOne({
    status: { $in: ["pending", "active"] },
    $or: [
      { hostA },
      { hostB },
    ],
  });

  if (existingPK) {
    throw new Error(
      "One of the users is already in a PK"
    );
  }

  const battle = await PKBattle.create({
    hostA,
    hostB,
    duration: safeDuration,
    status: "pending",
  });

  return battle;
};


// ==========================================
// VERIFY HOST
// ==========================================

const verifyHost = (battle, userId) => {
  if (!userId) {
    throw new Error("Authentication required");
  }

  const id = userId.toString();

  const isHostA =
    battle.hostA.toString() === id;

  const isHostB =
    battle.hostB.toString() === id;

  if (!isHostA && !isHostB) {
    throw new Error(
      "You are not a host of this PK"
    );
  }

  return {
    isHostA,
    isHostB,
  };
};


// ==========================================
// START PK
// ==========================================

export const startPK = async (
  battleId,
  userId
) => {
  const battle = await PKBattle.findById(
    battleId
  );

  if (!battle) {
    throw new Error("PK battle not found");
  }

  verifyHost(battle, userId);

  if (battle.status !== "pending") {
    throw new Error(
      "PK cannot be started"
    );
  }

  battle.status = "active";
  battle.startedAt = new Date();

  await battle.save();

  return battle;
};


// ==========================================
// ADD PK SCORE
// ==========================================

export const addPKScore = async (
  battleId,
  userId,
  points
) => {

  if (!battleId || !userId) {
    throw new Error(
      "Battle ID and user ID are required"
    );
  }


  const numericPoints =
    Number(points);


  if (
    !Number.isFinite(
      numericPoints
    ) ||
    numericPoints <= 0 ||
    !Number.isSafeInteger(
      numericPoints
    )
  ) {

    throw new Error(
      "Invalid PK points"
    );
  }


  const battle =
    await PKBattle.findById(
      battleId
    );


  if (!battle) {
    throw new Error(
      "PK battle not found"
    );
  }


  if (
    battle.status !== "active"
  ) {

    throw new Error(
      "PK is not active"
    );
  }


  const {
    isHostA,
    isHostB,
  } =
    verifyHost(
      battle,
      userId
    );


  // ------------------------------------------
  // MongoDB ATOMIC SCORE UPDATE
  // ------------------------------------------

  const increment =
    isHostA
      ? { hostAScore: numericPoints }
      : { hostBScore: numericPoints };


  const updatedBattle =
    await PKBattle.findByIdAndUpdate(
      battleId,

      {
        $inc: increment,
      },

      {
        new: true,
      }
    );


  if (!updatedBattle) {

    throw new Error(
      "Failed to update PK score"
    );
  }


  return {

    battle:
      updatedBattle,

    hostAScore:
      updatedBattle.hostAScore,

    hostBScore:
      updatedBattle.hostBScore,

    isHostA,

    isHostB,

  };
};


// ==========================================
// FINISH PK
// ==========================================

export const finishPK = async (
  battleId,
  userId
) => {
  const battle = await PKBattle.findById(
    battleId
  );

  if (!battle) {
    throw new Error(
      "PK battle not found"
    );
  }

  verifyHost(battle, userId);

  if (battle.status !== "active") {
    throw new Error(
      "PK is not active"
    );
  }

  battle.status = "completed";
  battle.endedAt = new Date();

  // Determine winner
  if (
    battle.hostAScore >
    battle.hostBScore
  ) {
    battle.winner =
      battle.hostA;

  } else if (
    battle.hostBScore >
    battle.hostAScore
  ) {
    battle.winner =
      battle.hostB;

  } else {
    // Draw
    battle.winner = null;
  }

  await battle.save();

  return battle;
};


// ==========================================
// GET PK
// ==========================================

export const getPK = async (
  battleId
) => {
  const battle =
    await PKBattle.findById(
      battleId
    )
      .populate(
        "hostA",
        "name username profilePic"
      )
      .populate(
        "hostB",
        "name username profilePic"
      )
      .populate(
        "winner",
        "name username profilePic"
      );

  if (!battle) {
    throw new Error(
      "PK battle not found"
    );
  }

  return battle;
};