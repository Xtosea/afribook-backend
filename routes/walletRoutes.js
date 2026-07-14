import express from "express";
import Wallet from "../models/Wallet.js";
import Withdrawal from "../models/Withdrawal.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import Transaction from "../models/Transaction.js";




const router = express.Router();

const RATE = 0.5;

/* ================= GET WALLET ================= */
router.get("/", verifyToken, async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ user: req.user.id });

    if (!wallet) {
      wallet = await Wallet.create({ user: req.user.id });
    }

    res.json({
      balance: wallet.balance || 0,
      points: wallet.points || 0,
      storyLikes: wallet.storyLikes || 0,
      storyViews: wallet.storyViews || 0,
      reelLikes: wallet.reelLikes || 0,
      reelViews: wallet.reelViews || 0,
      videoLikes: wallet.videoLikes || 0,
      videoViews: wallet.videoViews || 0,
      referralPoints: wallet.referralPoints || 0,
      leaderboardPoints: wallet.leaderboardPoints || 0,
      lifetimeEarned: wallet.lifetimeEarned || 0,
      pending: wallet.pending || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get wallet" });
  }
});

/* ================= CONVERT POINTS ================= */
router.post("/convert", verifyToken, async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ user: req.user.id });

    if (!wallet) {
      wallet = await Wallet.create({ user: req.user.id });
    }

    if (wallet.points < 10000) {
      return res.status(400).json({
        error: "Minimum 10000 points required",
      });
    }

    const pointsConverted = wallet.points;
const cash = pointsConverted * RATE;

    wallet.balance = (wallet.balance || 0) + cash;
    wallet.lifetimeEarned = (wallet.lifetimeEarned || 0) + cash;
    wallet.points = 0;

    await wallet.save();


const reference = `WD-${Date.now()}`;

await Transaction.create({
  user: req.user.id,
  type: "withdrawal",
  category: "withdrawal",
  amount: Number(amount),
  direction: "debit",
  status: "pending",
  reference,
  description: "Withdrawal request",
  metadata: {
    bankName,
    accountNumber,
    accountName,
  },
});


await Transaction.create({
  user: req.user.id,
  type: "conversion",
  category: "points_conversion",
  amount: cash,
  direction: "credit",
  status: "success",
  reference: `POINTS-${Date.now()}`,
  description: "Converted points to wallet balance",
  metadata: {
    pointsConverted,
  },
});

    res.json({
      success: true,
      balance: wallet.balance,
      earned: cash,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Conversion failed" });
  }
});


/* ================= SPEND FROM WALLET ================= */
router.post("/spend", verifyToken, async (req, res) => {
  try {
    const {
      amount,
      category,
      description,
      metadata = {},
    } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        error: "Invalid amount",
      });
    }

    let wallet = await Wallet.findOne({
      user: req.user.id,
    });

    if (!wallet) {
      wallet = await Wallet.create({
        user: req.user.id,
      });
    }

    if (wallet.balance < Number(amount)) {
      return res.status(400).json({
        error: "Insufficient wallet balance",
      });
    }

    wallet.balance -= Number(amount);

    await wallet.save();

    const transaction = await Transaction.create({
      user: req.user.id,
      type: "purchase",
      category: category || "other",
      amount: Number(amount),
      currency: "NGN",
      paymentMethod: "wallet",
      reference: `PUR-${Date.now()}`,
      status: "success",
      description:
        description || "Wallet purchase",
      metadata,
    });

    res.json({
      success: true,
      balance: wallet.balance,
      transaction,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Wallet payment failed",
    });
  }
});

/* ================= WITHDRAW ================= */
router.post("/withdraw", verifyToken, async (req, res) => {
  try {
    const { amount, bankName, accountNumber, accountName } = req.body;

    let wallet = await Wallet.findOne({ user: req.user.id });

    if (!wallet) {
      wallet = await Wallet.create({ user: req.user.id });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    if (!bankName || !accountNumber || !accountName) {
      return res.status(400).json({ error: "Bank details required" });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    wallet.balance -= Number(amount);
    wallet.pending = (wallet.pending || 0) + Number(amount);

    await wallet.save();

    const withdrawal = await Withdrawal.create({
  user: req.user.id,
  amount,
  bankName,
  accountNumber,
  accountName,
  reference,
  status: "pending",
});

    return res.json({
      success: true,
      message: "Withdrawal submitted",
      withdrawal,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Withdrawal failed" });
  }
});

export default router;