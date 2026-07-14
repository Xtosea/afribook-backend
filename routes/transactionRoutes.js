import express from "express";
import Transaction from "../models/Transaction.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { adminMiddleware } from "../middleware/adminMiddleware.js";


const router = express.Router();

/* ================= GET MY TRANSACTIONS ================= */

router.get("/me", verifyToken, async (req, res) => {
  try {
    const transactions = await Transaction.find({
      user: req.user.id,
    })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: transactions.length,
      transactions,
    });

  } catch (err) {
    console.error("GET TRANSACTIONS ERROR:", err);

    res.status(500).json({
      success: false,
      error: "Failed to fetch transactions",
    });
  }
});

/* ================= GET SINGLE TRANSACTION ================= */

router.get("/:id", verifyToken, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: "Transaction not found",
      });
    }

    res.json({
      success: true,
      transaction,
    });

  } catch (err) {
    console.error("GET TRANSACTION ERROR:", err);

    res.status(500).json({
      success: false,
      error: "Failed to fetch transaction",
    });
  }
});

/* ================= ADMIN: ALL TRANSACTIONS ================= */

router.get("/", verifyToken, adminMiddleware, async (req, res) => {
  try {

    const transactions = await Transaction.find()
      .populate("user", "name email profilePic")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: transactions.length,
      transactions,
    });

  } catch (err) {
    console.error("GET ALL TRANSACTIONS ERROR:", err);

    res.status(500).json({
      success: false,
      error: "Failed to fetch transactions",
    });
  }
});

export default router;