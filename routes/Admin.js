import express from "express";
import Verification from "../models/Verification.js";
import User from "../models/User.js";
import Withdrawal from "../models/Withdrawal.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { sendNotification } from "../utils/sendNotification.js";


router.put(
  "/approve/:id",
  verifyToken,
  async (req, res) => {

    try {

      const verification =
        await Verification.findById(
          req.params.id
        );

      verification.status =
        "APPROVED";

      await verification.save();

      await User.findByIdAndUpdate(
        verification.user,
        {
          verified: true,

          verificationStatus:
            "APPROVED",
        }
      );

      res.json({
        success: true,
      });

    } catch (err) {

      res.status(500).json({
        error:
          "Approval failed",
      });
    }
  }
);


const withdrawal = await Withdrawal.create({
  user: req.user.id,
  amount,
  bankName,
  accountNumber,
  accountName,
  status: "pending",
});

res.json({
  success: true,
  message: "Withdrawal submitted",
  withdrawal,
});


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

      verification.status = "APPROVED";

      await verification.save();

      await User.findByIdAndUpdate(
        verification.user,
        {
          verified: true,
          verificationStatus: "APPROVED",
        }
      );

      // SEND NOTIFICATION
      await sendNotification({
        recipient: verification.user,
        type: "VERIFICATION_APPROVED",
        text: "Your account has been verified",
      });

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
