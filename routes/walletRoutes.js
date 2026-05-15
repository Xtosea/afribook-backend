import express from "express";
import Wallet from "../models/Wallet.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// 10000 points = 5000 NGN
const RATE = 0.5;

router.post(
  "/convert",
  verifyToken,
  async (req, res) => {
    try {
      const wallet =
        await Wallet.findOne({
          user: req.user._id,
        });

      if (!wallet) {
        return res.status(404).json({
          error: "Wallet not found",
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

      wallet.balance += cash;

      wallet.lifetimeEarned += cash;

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

router.get(
  "/",
  verifyToken,
  async (req, res) => {
    try {
      const wallet =
        await Wallet.findOne({
          user: req.user._id,
        });

      res.json(wallet);
    } catch (err) {
      res.status(500).json({
        error: "Failed to get wallet",
      });
    }
  }
);


router.post(
  "/withdraw",
  verifyToken,
  async (req, res) => {
    try {

      const {
        amount,
        bankName,
        accountNumber,
        accountName,
      } = req.body;

      const wallet =
        await Wallet.findOne({
          user:
            req.user._id,
        });

      if (
        wallet.balance <
        amount
      ) {
        return res.status(400).json({
          error:
            "Insufficient balance",
        });
      }

      wallet.balance -= amount;

      await wallet.save();

      const withdrawal =
        await Withdrawal.create({
          user:
            req.user._id,

          amount,

          bankName,

          accountNumber,

          accountName,
        });

      res.json({
        success: true,
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