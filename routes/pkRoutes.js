// routes/pkRoutes.js

import express from "express";

import {
  createPKController,
  startPKController,
  addPKScoreController,
  finishPKController,
  getPKController,
  getPKHistoryController,
  getPKStatsController,
} from "../controllers/pkController.js";

import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();


// ==========================================
// CREATE PK
// POST /api/pk
// ==========================================

router.post(
  "/",
  verifyToken,
  createPKController
);


// ==========================================
// GET MY PK HISTORY
// GET /api/pk/history
// ==========================================

router.get(
  "/history",
  verifyToken,
  getPKHistoryController
);


// ==========================================
// GET MY PK STATISTICS
// GET /api/pk/stats
// ==========================================

router.get(
  "/stats",
  verifyToken,
  getPKStatsController
);

// ==========================================
// START PK
// POST /api/pk/:battleId/start
// ==========================================

router.post(
  "/:battleId/start",
  verifyToken,
  startPKController
);


// ==========================================
// ADD PK SCORE
// POST /api/pk/:battleId/score
// ==========================================

router.post(
  "/:battleId/score",
  verifyToken,
  addPKScoreController
);


// ==========================================
// FINISH PK
// POST /api/pk/:battleId/finish
// ==========================================

router.post(
  "/:battleId/finish",
  verifyToken,
  finishPKController
);


// ==========================================
// GET PK
// GET /api/pk/:battleId
// ==========================================

router.get(
  "/:battleId",
  verifyToken,
  getPKController
);

export default router;