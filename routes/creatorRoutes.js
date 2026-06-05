import express from "express";

import {
  getEarnings,
  getRevenueHistory,
  getAnalytics,
  creatorWithdraw,
} from "../controllers/creatorController.js";

import {
  verifyToken,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/earnings",
  verifyToken,
  getEarnings
);

router.get(
  "/revenue",
  verifyToken,
  getRevenueHistory
);

router.get(
  "/analytics",
  verifyToken,
  getAnalytics
);

router.post(
  "/withdraw",
  verifyToken,
  creatorWithdraw
);

export default router;
