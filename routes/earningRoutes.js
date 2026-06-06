import express from "express";
import CreatorEarning from "../models/CreatorEarning.js";
import { verifyToken }
from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================
   MY EARNINGS
========================= */

router.get(
  "/me",
  verifyToken,
  async (req, res) => {
    try {

      const earnings =
        await CreatorEarning.find({
          creator:
            req.user.id,
        })
        .sort({
          createdAt: -1,
        });

      const pending =
        earnings
          .filter(
            e =>
              e.status ===
              "pending"
          )
          .reduce(
            (sum, e) =>
              sum + e.amount,
            0
          );

      const approved =
        earnings
          .filter(
            e =>
              e.status ===
              "approved"
          )
          .reduce(
            (sum, e) =>
              sum + e.amount,
            0
          );

      const paid =
        earnings
          .filter(
            e =>
              e.status ===
              "paid"
          )
          .reduce(
            (sum, e) =>
              sum + e.amount,
            0
          );

      const rejected =
        earnings
          .filter(
            e =>
              e.status ===
              "rejected"
          )
          .reduce(
            (sum, e) =>
              sum + e.amount,
            0
          );

      res.json({
        pending,
        approved,
        paid,
        rejected,
        total:
          pending +
          approved +
          paid,
        earnings,
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to load earnings",
      });
    }
  }
);

export default router;