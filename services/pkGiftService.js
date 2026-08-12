// services/pkGiftService.js

import mongoose from "mongoose";

import User from "../models/User.js";
import Gift from "../models/Gift.js";
import PKBattle from "../models/PKBattle.js";
import CoinTransaction from "../models/CoinTransaction.js";
import Wallet from "../models/Wallet.js";
import {
  addPKRoomScore,
} from "./pkSocketService.js";



// ==========================================
// SEND GIFT DURING PK
// ==========================================

export const sendPKGift = async ({
  senderId,
  battleId,
  receiverId,
  giftId,
}) => {

  if (
    !senderId ||
    !battleId ||
    !receiverId ||
    !giftId
  ) {
    throw new Error(
      "Sender, battle, receiver and gift are required"
    );
  }


  // ------------------------------------------
  // Validate IDs
  // ------------------------------------------

  if (
    !mongoose.isValidObjectId(senderId) ||
    !mongoose.isValidObjectId(battleId) ||
    !mongoose.isValidObjectId(receiverId) ||
    !mongoose.isValidObjectId(giftId)
  ) {
    throw new Error("Invalid PK gift data");
  }


  const session =
    await mongoose.startSession();


  try {

    let result;


    await session.withTransaction(
      async () => {

        // ==========================================
        // GET BATTLE
        // ==========================================

        const battle =
          await PKBattle.findById(
            battleId
          ).session(session);


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


        // ==========================================
        // VERIFY RECEIVER IS A HOST
        // ==========================================

        const receiverIsHostA =
          battle.hostA.toString() ===
          receiverId.toString();


        const receiverIsHostB =
          battle.hostB.toString() ===
          receiverId.toString();


        if (
          !receiverIsHostA &&
          !receiverIsHostB
        ) {
          throw new Error(
            "Gift receiver is not a PK host"
          );
        }


        // ==========================================
        // PREVENT SENDING TO YOURSELF
        // ==========================================

        if (
          senderId.toString() ===
          receiverId.toString()
        ) {
          throw new Error(
            "You cannot send a gift to yourself"
          );
        }


        // ==========================================
        // GET GIFT
        // ==========================================

        const gift =
          await Gift.findOne({
            _id: giftId,
            active: true,
          }).session(session);


        if (!gift) {
          throw new Error(
            "Gift not found or unavailable"
          );
        }


        const coinCost =
          Number(gift.coinCost);


        const pkPoints =
          Number(gift.pkPoints);


        if (
          !Number.isSafeInteger(
            coinCost
          ) ||
          coinCost <= 0
        ) {
          throw new Error(
            "Invalid gift coin cost"
          );
        }


        if (
          !Number.isSafeInteger(
            pkPoints
          ) ||
          pkPoints <= 0
        ) {
          throw new Error(
            "Invalid gift PK points"
          );
        }


        // ==========================================
        // ATOMICALLY DEDUCT USER COINS
        // ==========================================

        const sender =
          await User.findOneAndUpdate(
            {
              _id: senderId,

              coins: {
                $gte: coinCost,
              },
            },
            {
              $inc: {
                coins: -coinCost,
              },
            },
            {
              new: false,
              session,
            }
          );


        if (!sender) {
          throw new Error(
            "Not enough coins"
          );
        }


        const balanceBefore =
          Number(sender.coins || 0);


        const balanceAfter =
          balanceBefore -
          coinCost;


        // ==========================================
        // UPDATE PK SCORE
        // ==========================================

        const scoreUpdate =
          receiverIsHostA
            ? {
                $inc: {
                  hostAScore: pkPoints,
                },
              }
            : {
                $inc: {
                  hostBScore: pkPoints,
                },
              };


        const updatedBattle =
          await PKBattle.findByIdAndUpdate(
            battleId,
            scoreUpdate,
            {
              new: true,
              session,
            }
          );


        if (!updatedBattle) {
          throw new Error(
            "Failed to update PK score"
          );
        }


        // ==========================================
// UPDATE LIVE REDIS PK SCORE
// ==========================================

const liveScore =
  await addPKRoomScore(
    battleId,
    receiverIsHostA,
    pkPoints
  );


        // ==========================================
        // RECORD COIN TRANSACTION
        // ==========================================

        const reference =
          `PKGIFT-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)
            .toUpperCase()}`;


        await CoinTransaction.create(
          [
            {
              user: senderId,

              type: "gift_sent",

              amount: coinCost,

              balanceBefore,

              balanceAfter,

              reference,

              description:
                `Sent ${gift.name} during PK battle`,

              metadata: {
                battleId,
                giftId,
                receiverId,

                giftName:
                  gift.name,

                emoji:
                  gift.emoji,

                coinCost,

                pkPoints,

                receiverSide:
                  receiverIsHostA
                    ? "A"
                    : "B",
              },
            },
          ],
          {
            session,
          }
        );


        // ==========================================
        // UPDATE WALLET ANALYTICS
        // ==========================================

        await Wallet.findOneAndUpdate(
          {
            user: senderId,
          },
          {
            $inc: {
              lifetimeCoinsSpent:
                coinCost,

              lifetimeSpent:
                coinCost,
            },
          },
          {
            upsert: true,
            session,
          }
        );


        result = {
          battle: updatedBattle,

          gift: {
            id: gift._id,
            name: gift.name,
            emoji: gift.emoji,
            coinCost,
            pkPoints,
          },

          receiverId,

          receiverSide:
            receiverIsHostA
              ? "A"
              : "B",

          balanceBefore,

          balanceAfter,
        };
      }
    );


     result = {
  battle: updatedBattle,

  liveScore,

  gift: {
    id: gift._id,
    name: gift.name,
    emoji: gift.emoji,
    coinCost,
    pkPoints,
  },

  receiverId,

  receiverSide:
    receiverIsHostA
      ? "A"
      : "B",

  balanceBefore,
  balanceAfter,
};


    return result;


  } finally {

    await session.endSession();

  }
};