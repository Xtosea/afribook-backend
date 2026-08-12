// services/pkService.js

import PKBattle from "../models/PKBattle.js";
import { settlePKReward } from "./pkRewardService.js";


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
// GET USER PK HISTORY
// ==========================================

export const getPKHistory = async (
  userId,
  page = 1,
  limit = 20
) => {
  if (!userId) {
    throw new Error("Authentication required");
  }

  const safePage = Math.max(
    1,
    Number(page) || 1
  );

  const safeLimit = Math.min(
    50,
    Math.max(
      1,
      Number(limit) || 20
    )
  );

  const skip =
    (safePage - 1) * safeLimit;

  const filter = {
    status: "completed",
    $or: [
      { hostA: userId },
      { hostB: userId },
    ],
  };

  const [battles, total] =
    await Promise.all([
      PKBattle.find(filter)
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
        )
        .sort({
          endedAt: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(safeLimit)
        .lean(),

      PKBattle.countDocuments(filter),
    ]);

  return {
    battles,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.ceil(
        total / safeLimit
      ),
      hasMore:
        skip + battles.length < total,
    },
  };
};


// ==========================================
// GET USER PK STATISTICS
// ==========================================

export const getPKStats = async (
  userId
) => {
  if (!userId) {
    throw new Error("Authentication required");
  }

  const battles = await PKBattle.find({
    $or: [
      { hostA: userId },
      { hostB: userId },
    ],
    status: "completed",
  });

  let totalBattles = battles.length;
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let totalPointsScored = 0;
  let bestScore = 0;

  const currentUserId =
    userId.toString();

  for (const battle of battles) {

    const isHostA =
      battle.hostA.toString() ===
      currentUserId;

    const myScore = isHostA
      ? battle.hostAScore || 0
      : battle.hostBScore || 0;

    const opponentScore = isHostA
      ? battle.hostBScore || 0
      : battle.hostAScore || 0;

    totalPointsScored += myScore;

    if (myScore > bestScore) {
      bestScore = myScore;
    }

    if (!battle.winner) {
      draws++;
      continue;
    }

    const winnerId =
      battle.winner.toString();

    if (winnerId === currentUserId) {
      wins++;
    } else {
      losses++;
    }
  }

  const winRate =
    totalBattles > 0
      ? Number(
          ((wins / totalBattles) * 100).toFixed(1)
        )
      : 0;

  return {
    totalBattles,
    wins,
    losses,
    draws,
    winRate,
    totalPointsScored,
    bestScore,
  };
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
  userId,
  finalScores = null
) => {

  const battle =
    await PKBattle.findById(
      battleId
    );


  if (!battle) {

    throw new Error(
      "PK battle not found"
    );

  }


  verifyHost(
    battle,
    userId
  );


  if (
    battle.status !==
    "active"
  ) {

    throw new Error(
      "PK is not active"
    );

  }


  // ------------------------------------------
  // Apply final Redis score if supplied
  // ------------------------------------------

  if (finalScores) {

    battle.hostAScore =
      Number(
        finalScores.hostAScore
      ) || 0;

    battle.hostBScore =
      Number(
        finalScores.hostBScore
      ) || 0;

  }


  // ------------------------------------------
  // Determine winner
  // ------------------------------------------

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

    battle.winner =
      null;

  }


  battle.status =
  "completed";

battle.endedAt =
  new Date();

await battle.save();


// ==========================================
// SETTLE PK REWARD
// ==========================================

const reward =
  await settlePKReward(
    battle._id
  );


return {
  battle,
  reward,
};

};

// ==========================================
// GET PK
// ==========================================

export const getPK = async (
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