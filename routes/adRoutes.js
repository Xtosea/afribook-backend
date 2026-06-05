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

router.get(
  "/analytics/:id",
  verifyToken,
  getCampaignAnalytics
);

router.put(
  "/pause/:id",
  verifyToken,
  pauseCampaign
);

router.put(
  "/resume/:id",
  verifyToken,
  resumeCampaign
);

router.delete(
  "/:id",
  verifyToken,
  deleteCampaign
);

/* =================================================
    CREATORS APPLY
================================================= */
router.post(
  "/apply",
  verifyToken,
  async (req, res) => {

    const user =
      await User.findById(
        req.user.id
      );

    user.monetizationStatus =
      "pending";

    await user.save();

    res.json({
      success: true,
    });
  }
);


/* =================================================
    ADVERTISERS APPLY
================================================= */
router.post(
  "/advertiser/apply",
  verifyToken,
  async (req, res) => {

    const user =
      await User.findById(
        req.user.id
      );

    user.advertiserStatus =
      "pending";

    await user.save();

    res.json({
      success: true,
    });
  }
);



export default router;
