// services/pkRewardService.js

import mongoose from "mongoose";

import PKBattle from "../models/PKBattle.js";
import PKReward from "../models/PKReward.js";
import CoinTransaction from "../models/CoinTransaction.js";
import Wallet from "../models/Wallet.js";
import Transaction from "../models/Transaction.js";


// ==========================================
// PK REWARD CONFIG
// ==========================================

// 20% goes to AfricSocial
// 80% goes to the winning creator.
const PLATFORM_FEE_RATE = 0.20;


// IMPORTANT:
// This is the current conversion from virtual
// coins to NGN.
//
// Change this later when you establish the
// official coin pricing model.
const COIN_TO_NGN = 1;


// ==========================================
// SETTLE PK REWARD
// ==========================================

export const settlePKReward = async (
  battleId
) => {

  if (
    !mongoose.isValidObjectId(
      battleId
    )
  ) {
    throw new Error(
      "Invalid PK battle ID"
    );
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
          battle.status !==
          "completed"
        ) {

          throw new Error(
            "PK battle is not completed"
          );

        }


        // ==========================================
        // IDEMPOTENCY CHECK
        // ==========================================

        const existingReward =
          await PKReward.findOne({
            battle: battleId,
          }).session(session);


        if (existingReward) {

          result = existingReward;

          return;

        }


        // ==========================================
        // DETERMINE RESULT
        // ==========================================

        let resultType;

        let winnerId = null;

        let loserId = null;

        let winnerScore = 0;

        let loserScore = 0;


        if (
          battle.hostAScore >
          battle.hostBScore
        ) {

          resultType = "A";

          winnerId =
            battle.hostA;

          loserId =
            battle.hostB;

          winnerScore =
            Number(
              battle.hostAScore
            );

          loserScore =
            Number(
              battle.hostBScore
            );

        } else if (
          battle.hostBScore >
          battle.hostAScore
        ) {

          resultType = "B";

          winnerId =
            battle.hostB;

          loserId =
            battle.hostA;

          winnerScore =
            Number(
              battle.hostBScore
            );

          loserScore =
            Number(
              battle.hostAScore
            );

        } else {

          resultType =
            "draw";

          winnerId =
            null;

          loserId =
            null;

          winnerScore =
            Number(
              battle.hostAScore
            );

          loserScore =
            Number(
              battle.hostBScore
            );

        }


        // ==========================================
        // TOTAL PK POINTS
        // ==========================================

        const totalPKPoints =
          winnerScore +
          loserScore;


        // ==========================================
        // CALCULATE TOTAL COINS SPENT
        // ==========================================

        const giftTransactions =
          await CoinTransaction.find({
            type: "gift_sent",
            "metadata.battleId":
              battle._id,
          })
            .session(session)
            .lean();


        const totalCoinsSpent =
          giftTransactions.reduce(
            (
              total,
              transaction
            ) => {

              return (
                total +
                Number(
                  transaction.amount
                || 0
                )
              );

            },
            0
          );


        // ==========================================
        // CONVERT COINS TO NGN
        // ==========================================

        const grossValue =
          totalCoinsSpent *
          COIN_TO_NGN;


        // ==========================================
        // PLATFORM FEE
        // ==========================================

        const platformFee =
          Number(
            (
              grossValue *
              PLATFORM_FEE_RATE
            ).toFixed(2)
          );


        // ==========================================
        // CREATOR REWARD POOL
        // ==========================================

        const creatorRewardPool =
          Number(
            (
              grossValue -
              platformFee
            ).toFixed(2)
          );


        // ==========================================
        // WINNER REWARD
        // ==========================================

        // For a draw we currently do not
        // automatically pay a winner.
        //
        // We will add a configurable 50/50
        // draw split later.

        const winnerReward =
          resultType === "draw"
            ? 0
            : creatorRewardPool;


        // ==========================================
        // CREATE REWARD REFERENCE
        // ==========================================

        const reference =
          `PKREWARD-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)
            .toUpperCase()}`;


        // ==========================================
        // CREATE PK REWARD
        // ==========================================

        const reward =
          await PKReward.create(
            [
              {
                battle:
                  battle._id,

                winner:
                  winnerId,

                loser:
                  loserId,

                result:
                  resultType,

                winnerScore,

                loserScore,

                totalPKPoints,

                totalCoinsSpent,

                platformFeeRate:
                  PLATFORM_FEE_RATE,

                platformFee,

                creatorRewardPool,

                winnerReward,

                status:
                  winnerReward > 0
                    ? "pending"
                    : "paid",

                reference,

                paidAt:
                  winnerReward > 0
                    ? null
                    : new Date(),

                metadata: {
                  coinToNGN:
                    COIN_TO_NGN,

                  grossValue,

                  giftCount:
                    giftTransactions.length,
                },
              },
            ],
            {
              session,
            }
          );


        const createdReward =
          reward[0];


        // ==========================================
        // CREDIT WINNER
        // ==========================================

        if (
          winnerId &&
          winnerReward > 0
        ) {

          const updatedWallet =
            await Wallet.findOneAndUpdate(
              {
                user: winnerId,
              },
              {
                $inc: {
  balance:
    winnerReward,

  earningBalance:
    winnerReward,

  lifetimeEarned:
    winnerReward,
},
              },
              {
                new: true,

                upsert: true,

                session,
              }
            );


          if (!updatedWallet) {

            throw new Error(
              "Failed to credit winner wallet"
            );

          }


          // ==========================================
          // RECORD EARNING TRANSACTION
          // ==========================================

          await Transaction.create(
            [
              {
                user:
                  winnerId,

                type:
                  "earning",

                category:
                  "creator_earning",

                amount:
                  winnerReward,

                currency:
                  "NGN",

                paymentMethod:
                  "wallet",

                reference:
                  `PKEARN-${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2, 8)
                    .toUpperCase()}`,

                status:
                  "success",

                description:
                  "PK battle winner reward",

                metadata: {
                  battleId:
                    battle._id,

                  rewardId:
                    createdReward._id,

                  winnerScore,

                  loserScore,

                  totalPKPoints,

                  totalCoinsSpent,

                  platformFee,

                  creatorRewardPool,
                },
              },
            ],
            {
              session,
            }
          );


          // ==========================================
          // MARK REWARD AS PAID
          // ==========================================

          createdReward.status =
            "paid";

          createdReward.paidAt =
            new Date();

          await createdReward.save({
            session,
          });

        }


        result =
          createdReward;

      }
    );


    return result;


  } finally {

    await session.endSession();

  }
};