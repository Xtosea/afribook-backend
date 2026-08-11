import express from "express";

import {
  getGiftsController,
  sendPKGiftController,
} from "../controllers/giftController.js";

import {
  verifyToken,
} from "../middleware/authMiddleware.js";


const router =
  express.Router();


// ==========================================
// GET ACTIVE GIFTS
// GET /api/gifts
// ==========================================

router.get(
  "/",
  verifyToken,
  getGiftsController
);


// ==========================================
// SEND GIFT DURING PK
// POST /api/gifts/pk
// ==========================================

router.post(
  "/pk",
  verifyToken,
  sendPKGiftController
);


export default router;