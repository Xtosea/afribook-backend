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

  const hostAId = hostA.toString();
  const hostBId = hostB.toString();

  if (hostAId === hostBId) {
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

  // ==========================================
  // 1. CLEAN UP STALE PENDING PKs
  // ==========================================

  // Pending invitations expire after 15 minutes.
  const pendingTimeoutMs =
    15 * 60 * 1000;

  const pendingCutoff =
    new Date(
      Date.now() - pendingTimeoutMs
    );

  await PKBattle.updateMany(
    {
      status: "pending",

      createdAt: {
        $lt: pendingCutoff,
      },

      $or: [
        { hostA: hostAId },
        { hostB: hostAId },
        { hostA: hostBId },
        { hostB: hostBId },
      ],
    },

    {
      $set: {
        status: "cancelled",
        endedAt: new Date(),
      },
    }
  );

  // ==========================================
  // 2. FIND ACTIVE PKs INVOLVING EITHER USER
  // ==========================================

  const activePKs =
    await PKBattle.find({
      status: "active",

      $or: [
        { hostA: hostAId },
        { hostB: hostAId },
        { hostA: hostBId },
        { hostB: hostBId },
      ],
    });

  // ==========================================
  // 3. AUTO-FINISH EXPIRED ACTIVE PKs
  // ==========================================

  const now = Date.now();

  for (const activePK of activePKs) {

    if (!activePK.startedAt) {
      continue;
    }

    const startedAt =
      new Date(
        activePK.startedAt
      ).getTime();

    const durationMs =
      Number(
        activePK.duration || 300
      ) * 1000;

    const expiresAt =
      startedAt + durationMs;

    if (now >= expiresAt) {

      console.log(
        "⏰ Auto-finishing expired PK:",
        activePK._id.toString()
      );

      try {

        await finishPK(
          activePK._id,
          null,
          null,
          true
        );

        console.log(
          "✅ Expired PK automatically completed:",
          activePK._id.toString()
        );

      } catch (error) {

        console.error(
          "❌ Failed to auto-finish expired PK:",
          activePK._id.toString(),
          error
        );

      }
    }
  }

  // ==========================================
  // 4. CHECK IF EITHER USER IS STILL IN A PK
  // ==========================================

  const existingPK =
    await PKBattle.findOne({

      status: {
        $in: [
          "pending",
          "active",
        ],
      },

      $or: [
        { hostA: hostAId },
        { hostB: hostAId },
        { hostA: hostBId },
        { hostB: hostBId },
      ],

    });

  // ==========================================
  // 5. DEBUG
  // ==========================================

  console.log(
    "🥊 CREATE PK CHECK:",
    {
      hostA: hostAId,
      hostB: hostBId,

      existingPK:
        existingPK
          ? {
              id:
                existingPK._id.toString(),

              hostA:
                existingPK.hostA.toString(),

              hostB:
                existingPK.hostB.toString(),

              status:
                existingPK.status,

              startedAt:
                existingPK.startedAt,

              createdAt:
                existingPK.createdAt,
            }
          : null,
    }
  );

  // ==========================================
  // 6. BLOCK IF EITHER USER IS BUSY
  // ==========================================

  if (existingPK) {

    throw new Error(
      "One of the users is already in a PK"
    );

  }

  // ==========================================
  // 7. CREATE NEW PK
  // ==========================================

  const battle =
    await PKBattle.create({
      hostA: hostAId,
      hostB: hostBId,
      duration: safeDuration,
      status: "pending",
    });

  console.log(
    "🥊 PK CREATED:",
    {
      battleId:
        battle._id.toString(),

      hostA: hostAId,
      hostB: hostBId,

      duration:
        safeDuration,
    }
  );

  return battle;
};