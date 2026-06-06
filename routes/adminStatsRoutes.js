import express from "express";
import User from "../models/User.js";
import AdCampaign from "../models/AdCampaign.js";
import Withdrawal from "../models/Withdrawal.js";
import CreatorEarning from "../models/CreatorEarning.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { isAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

/* ================= ADMIN STATS ================= */

router.get(
  "/stats",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const users = await User.countDocuments();

      const creators = await User.countDocuments({
        role: "user",
        monetizationStatus: "approved",
      });

      const advertisers = await User.countDocuments({
        advertiserStatus: "approved",
      });

      const campaigns = await AdCampaign.countDocuments();

      const pendingWithdrawals =
        await Withdrawal.countDocuments({
          status: "pending",
        });

      const pendingEarnings =
        await CreatorEarning.countDocuments({
          status: "pending",
        });

      const totalPaidEarnings =
        await CreatorEarning.find({
          status: "paid",
        });

      const totalCreatorPayouts =
        totalPaidEarnings.reduce(
          (sum, e) => sum + e.amount,
          0
        );

      const totalCampaignSpend =
        await AdCampaign.find();

      const totalSpend = totalCampaignSpend.reduce(
        (sum, c) => sum + (c.spent || 0),
        0
      );

      const revenue =
        totalSpend - totalCreatorPayouts;

      res.json({
        users,
        creators,
        advertisers,
        campaigns,
        pendingWithdrawals,
        pendingEarnings,
        totalCreatorPayouts,
        totalSpend,
        revenue,
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: "Failed to load stats",
      });
    }
  }
);

export default router;