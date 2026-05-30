import express from "express";
import Wallet from "../models/Wallet.js";
import Withdrawal from "../models/Withdrawal.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// 10000 points = 5000 NGN
const RATE = 0.5;

/* ================= CONVERT POINTS ================= */

router.post(
  "/convert",
  verifyToken,
  async (req, res) => {
    try {
      let wallet =
        await Wallet.findOne({
          user: req.user._id,
        });

      if (!wallet) {
        wallet =
          await Wallet.create({
            user: req.user._id,
          });
      }

      if (wallet.points < 10000) {
        return res.status(400).json({
          error:
            "Minimum 10000 points required",
        });
      }

      const cash =
        wallet.points * RATE;

      wallet.balance =
        (wallet.balance || 0) +
        cash;

      wallet.lifetimeEarned =
        (wallet.lifetimeEarned || 0) +
        cash;

      wallet.points = 0;

      await wallet.save();

      res.json({
        success: true,
        balance: wallet.balance,
        points: wallet.points,
        earned: cash,
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Conversion failed",
      });
    }
  }
);

/* ================= GET WALLET ================= */

router.get(
  "/",
  verifyToken,
  async (req, res) => {
    try {
      let wallet =
        await Wallet.findOne({
          user: req.user._id,
        });

      if (!wallet) {
        wallet =
          await Wallet.create({
            user: req.user._id,
          });
      }

      res.json({
        balance:
          wallet.balance || 0,

        points:
          wallet.points || 0,

        storyLikes:
          wallet.storyLikes || 0,

        storyViews:
          wallet.storyViews || 0,

        reelLikes:
          wallet.reelLikes || 0,

        reelViews:
          wallet.reelViews || 0,

        videoLikes:
          wallet.videoLikes || 0,

        videoViews:
          wallet.videoViews || 0,

        referralPoints:
          wallet.referralPoints || 0,

        leaderboardPoints:
          wallet.leaderboardPoints || 0,

        lifetimeEarned:
          wallet.lifetimeEarned || 0,

        pending:
          wallet.pending || 0,
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Failed to get wallet",
      });
    }
  }
);

/* ================= WITHDRAW ================= */

const withdrawal =
        await Withdrawal.create({
          user: req.user._id,
          amount,
          bankName,
          accountNumber,
          accountName,
          status: "pending",
        });

      res.json({
        success: true,
        message:
          "Withdrawal request submitted",
        withdrawal,
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error:
          "Withdrawal failed",
      });
    }
  }
);

export default router;