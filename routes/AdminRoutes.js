import express from "express";
import AdImpression
from "../models/AdImpression.js";
import { sendNotification } from "../utils/sendNotification.js";

import Verification from "../models/Verification.js";
import User from "../models/User.js";
import Withdrawal from "../models/Withdrawal.js";

import Wallet from "../models/Wallet.js";
import AdCampaign from "../models/AdCampaign.js";
import {
  isAdmin,
} from "../middleware/adminMiddleware.js";

const router = express.Router();


router.put(
  "/withdrawals/:id/approve",
  verifyToken,
  isAdmin,
  async (req, res) => {
    // admin logic
  }
);

/* =================================================
   VERIFY ADMIN ACCESS (basic placeholder)
   You can later replace with role-based check
================================================= */
const isAdmin = (req, res, next) => {
  // Example: if (req.user.role !== "admin") return res.status(403)...
  next();
};

/* =================================================
   APPROVE VERIFICATION
================================================= */
router.put(
  "/verification/:id/approve",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const verification = await Verification.findById(req.params.id);

      if (!verification) {
        return res.status(404).json({
          error: "Verification not found",
        });
      }

      verification.status = "APPROVED";
      await verification.save();

      await User.findByIdAndUpdate(verification.user, {
        verified: true,
        verificationStatus: "APPROVED",
      });

      await sendNotification({
        recipient: verification.user,
        type: "VERIFICATION_APPROVED",
        text: "Your account has been verified",
      });

      res.json({ success: true });

    } catch (err) {
      console.error("VERIFY APPROVAL ERROR:", err);
      res.status(500).json({ error: "Approval failed" });
    }
  }
);

/* =================================================
   REJECT VERIFICATION
================================================= */
router.put(
  "/verification/:id/reject",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const verification = await Verification.findById(req.params.id);

      if (!verification) {
        return res.status(404).json({
          error: "Verification not found",
        });
      }

      verification.status = "REJECTED";
      await verification.save();

      await User.findByIdAndUpdate(verification.user, {
        verified: false,
        verificationStatus: "REJECTED",
      });

      await sendNotification({
        recipient: verification.user,
        type: "POINT_REWARD",
        text: "Your verification was not approved",
      });

      res.json({ success: true });

    } catch (err) {
      console.error("VERIFY REJECT ERROR:", err);
      res.status(500).json({ error: "Rejection failed" });
    }
  }
);

/* =================================================
   APPROVE WITHDRAWAL
================================================= */
router.put(
  "/withdrawals/:id/approve",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const withdrawal = await Withdrawal.findById(req.params.id);

      if (!withdrawal) {
        return res.status(404).json({
          error: "Withdrawal not found",
        });
      }

      withdrawal.status = "approved";
      await withdrawal.save();

      await sendNotification({
        recipient: withdrawal.user,
        type: "WITHDRAWAL_APPROVED",
        text: "Your withdrawal has been approved",
      });

      res.json({ success: true });

    } catch (err) {
      console.error("WITHDRAWAL APPROVE ERROR:", err);
      res.status(500).json({ error: "Approval failed" });
    }
  }
);

/* =================================================
   REJECT WITHDRAWAL
================================================= */
router.put(
  "/withdrawals/:id/reject",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const withdrawal = await Withdrawal.findById(req.params.id);

      if (!withdrawal) {
        return res.status(404).json({
          error: "Withdrawal not found",
        });
      }

      withdrawal.status = "rejected";
      await withdrawal.save();

      await sendNotification({
        recipient: withdrawal.user,
        type: "WITHDRAWAL_REJECTED",
        text: "Your withdrawal was rejected",
      });

      res.json({ success: true });

    } catch (err) {
      console.error("WITHDRAWAL REJECT ERROR:", err);
      res.status(500).json({ error: "Rejection failed" });
    }
  }
);

/* =================================================
   GET ALL VERIFICATIONS (ADMIN PANEL)
================================================= */
router.get(
  "/verifications",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const verifications = await Verification.find()
        .populate("user", "name profilePic verified")
        .sort({ createdAt: -1 });

      res.json(verifications);

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch verifications" });
    }
  }
);

/* =================================================
   GET ALL WITHDRAWALS (ADMIN PANEL)
================================================= */
router.get(
  "/withdrawals",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {
      const withdrawals = await Withdrawal.find()
        .populate("user", "name profilePic")
        .sort({ createdAt: -1 });

      res.json(withdrawals);

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch withdrawals" });
    }
  }
);



/* =================================================
   BADGE APPROVAL(ADMIN PANEL)
================================================= */
router.put(
  "/approve/:id",
  verifyToken,
  async (req, res) => {
    try {
      const verification =
        await Verification.findById(
          req.params.id
        );

      if (!verification) {
        return res.status(404).json({
          error: "Verification not found",
        });
      }

      verification.status =
        "APPROVED";

      await verification.save();

      await User.findByIdAndUpdate(
        verification.user,
        {
          verified: true,
          verificationStatus:
            "APPROVED",
          verificationBadge:
            "blue",
        }
      );

      res.json({
        success: true,
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Approval failed",
      });
    }
  }
);


/* =================================================
   BADGE REJECTION(ADMIN PANEL)
================================================= */
router.put(
  "/reject/:id",
  verifyToken,
  async (req, res) => {
    try {
      const verification =
        await Verification.findById(
          req.params.id
        );

      verification.status =
        "REJECTED";

      await verification.save();

      await User.findByIdAndUpdate(
        verification.user,
        {
          verified: false,
          verificationStatus:
            "REJECTED",
        }
      );

      res.json({
        success: true,
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Reject failed",
      });
    }
  }
);

/* =================================================
   Add Monetization Fields To User
================================================= */
isMonetized: {
  type: Boolean,
  default: false,
},

monetizationStatus: {
  type: String,
  enum: [
    "none",
    "pending",
    "approved",
    "rejected",
  ],
  default: "none",
},

isAdvertiser: {
  type: Boolean,
  default: false,
},

advertiserStatus: {
  type: String,
  enum: [
    "none",
    "pending",
    "approved",
    "rejected",
  ],
  default: "none",
},


/* =================================================
   Approve Creator Monetization
================================================= */
router.put(
  "/creator/:id/approve",
  verifyToken,
  isAdmin,
  async (req, res) => {

    await User.findByIdAndUpdate(
      req.params.id,
      {
        isMonetized: true,
        monetizationStatus:
          "approved",
      }
    );

    res.json({
      success: true,
    });
  }
);


/* =================================================
   Reject Creator Monetization
================================================= */
router.put(
  "/creator/:id/reject",
  verifyToken,
  isAdmin,
  async (req, res) => {

    await User.findByIdAndUpdate(
      req.params.id,
      {
        isMonetized: false,
        monetizationStatus:
          "rejected",
      }
    );

    res.json({
      success: true,
    });
  }
);


/* =================================================
   Approve Advertiser
================================================= */
router.put(
  "/advertiser/:id/approve",
  verifyToken,
  isAdmin,
  async (req, res) => {

    await User.findByIdAndUpdate(
      req.params.id,
      {
        isAdvertiser: true,
        advertiserStatus:
          "approved",
      }
    );

    res.json({
      success: true,
    });
  }
);



/* =================================================
   Reject Advertiser(ADMIN PANEL)
================================================= */
router.put(
  "/advertiser/:id/reject",
  verifyToken,
  isAdmin,
  async (req, res) => {

    await User.findByIdAndUpdate(
      req.params.id,
      {
        isAdvertiser: false,
        advertiserStatus:
          "rejected",
      }
    );

    res.json({
      success: true,
    });
  }
);


/* =================================================
   ADMIN STATS
================================================= */
router.get(
  "/stats",
  verifyToken,
  isAdmin,
  async (req, res) => {

    const users =
      await User.countDocuments();

    const creators =
      await User.countDocuments({
        isMonetized: true,
      });

    const advertisers =
      await User.countDocuments({
        isAdvertiser: true,
      });

    const campaigns =
      await AdCampaign.countDocuments();

    const pendingWithdrawals =
      await Withdrawal.countDocuments({
        status: "pending",
      });

    res.json({
      users,
      creators,
      advertisers,
      campaigns,
      pendingWithdrawals,
    });
  }
);

/* =================================================
   Fraud Detection Endpoint
================================================= */
const suspicious =
await AdImpression.aggregate([
  {
    $group: {
      _id: "$viewer",
      count: {
        $sum: 1,
      },
    },
  },
  {
    $match: {
      count: {
        $gt: 100,
      },
    },
  },
]);

/* =================================================
   GET CREATOR MONETIZATION REQUESTS
================================================= */
router.get(
  "/creators",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {

      const creators =
        await User.find({
          monetizationStatus: {
            $in: [
              "pending",
              "approved",
              "rejected",
            ],
          },
        })
        .select(
          "name email profilePic isMonetized monetizationStatus createdAt"
        )
        .sort({
          createdAt: -1,
        });

      res.json(creators);

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to fetch creators",
      });
    }
  }
);

/* =================================================
   GET ADVERTISERS
================================================= */
router.get(
  "/advertisers",
  verifyToken,
  isAdmin,
  async (req, res) => {

    try {

      const advertisers =
        await User.find({
          advertiserStatus: {
            $in: [
              "pending",
              "approved",
              "rejected",
            ],
          },
        })
        .select(
          "name email profilePic isAdvertiser advertiserStatus createdAt"
        )
        .sort({
          createdAt: -1,
        });

      res.json(
        advertisers
      );

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to fetch advertisers",
      });
    }
  }
);

router.get(
  "/campaigns",
  verifyToken,
  isAdmin,
  async (req, res) => {
    try {

      const campaigns =
        await AdCampaign.find()
          .populate(
            "advertiser",
            "name profilePic email"
          )
          .sort({
            createdAt: -1,
          });

      res.json(campaigns);

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to fetch campaigns",
      });
    }
  }
);

/* =================================================
   FRAUD 
================================================= */

router.put(
  "/campaign/:id/pause",
  verifyToken,
  isAdmin,
  async (req, res) => {

    try {

      const campaign =
        await AdCampaign.findById(
          req.params.id
        );

      if (!campaign) {
        return res.status(404).json({
          error:
            "Campaign not found",
        });
      }

      campaign.status =
        "paused";

      await campaign.save();

      res.json({
        success: true,
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Pause failed",
      });
    }
  }
);

router.put(
  "/campaign/:id/resume",
  verifyToken,
  isAdmin,
  async (req, res) => {

    try {

      const campaign =
        await AdCampaign.findById(
          req.params.id
        );

      if (!campaign) {
        return res.status(404).json({
          error:
            "Campaign not found",
        });
      }

      campaign.status =
        "active";

      await campaign.save();

      res.json({
        success: true,
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Resume failed",
      });
    }
  }
);

router.delete(
  "/campaign/:id",
  verifyToken,
  isAdmin,
  async (req, res) => {

    try {

      await AdCampaign.findByIdAndDelete(
        req.params.id
      );

      res.json({
        success: true,
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Delete failed",
      });
    }
  }
);





export default router;
