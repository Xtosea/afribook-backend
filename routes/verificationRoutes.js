import express from "express";

import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import Verification from "../models/Verification.js";

import {
  verifyToken,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/wallet",
  verifyToken,
  async (req, res) => {

    try {

      const PRICE = 5000;

      const wallet =
        await Wallet.findOne({
          user: req.user._id,
        });

      if (!wallet) {
        return res.status(404).json({
          error: "Wallet not found",
        });
      }

      if (
        wallet.balance < PRICE
      ) {
        return res.status(400).json({
          error:
            "Insufficient balance",
        });
      }

      const existing =
        await Verification.findOne({
          user: req.user._id,
          status: "PENDING",
        });

      if (existing) {
        return res.status(400).json({
          error:
            "Verification already pending",
        });
      }

      wallet.balance -= PRICE;

      await wallet.save();

      const verification =
        await Verification.create({
          user: req.user._id,
          paymentMethod:
            "WALLET",

          amount: PRICE,
        });

      await User.findByIdAndUpdate(
        req.user._id,
        {
          verificationStatus:
            "PENDING",
        }
      );

      res.json({
        success: true,
        verification,
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Verification failed",
      });
    }
  }
);


router.post(
  "/transfer",
  verifyToken,
  async (req, res) => {

    try {

      const {
        proof,
      } = req.body;

      const verification =
        await Verification.create({
          user: req.user._id,

          paymentMethod:
            "TRANSFER",

          proof,
        });

      await User.findByIdAndUpdate(
        req.user._id,
        {
          verificationStatus:
            "PENDING",
        }
      );

      res.json({
        success: true,
        verification,
      });

    } catch (err) {

      res.status(500).json({
        error:
          "Transfer verification failed",
      });
    }
  }
);

export default router;