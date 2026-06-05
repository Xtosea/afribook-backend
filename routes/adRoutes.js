import express from "express";

import {
  createCampaign,
  getMyCampaigns,
  serveAd,
  recordImpression,
  recordClick,
} from "../controllers/adController.js";

import {
  verifyToken,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/create",
  verifyToken,
  createCampaign
);

router.get(
  "/my-campaigns",
  verifyToken,
  getMyCampaigns
);

router.get(
  "/serve",
  verifyToken,
  serveAd
);

router.post(
  "/impression",
  verifyToken,
  recordImpression
);

router.post(
  "/click",
  verifyToken,
  recordClick
);

export default router;
