import express from "express";

import {
  getGiftsController,
} from "../controllers/giftController.js";

import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// GET GIFTS
// GET /api/gifts
// ==========================================

router.get(
  "/",
  verifyToken,
  getGiftsController
);

export default router;