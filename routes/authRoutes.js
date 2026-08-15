import express from "express";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import { sendEmail } from "../utils/mailer.js";
import { addPoints } from "../utils/addPoints.js";
import Wallet from "../models/Wallet.js";

const router = express.Router();

/* ================= REGISTER ================= */

router.post("/register", async (req, res) => {
  const {
    name,
    identifier,
    password,
    referralCode,
  } = req.body;

  if (!name || !identifier || !password) {
    return res.status(400).json({
      error: "Name, email or phone, and password are required",
    });
  }

  try {
    const cleanIdentifier = identifier.trim();

    const isEmail = cleanIdentifier.includes("@");

    const query = isEmail
      ? { email: cleanIdentifier.toLowerCase() }
      : { phone: cleanIdentifier };

    // CHECK EXISTING USER
    const existingUser = await User.findOne(query);

    if (existingUser) {
      return res.status(400).json({
        error: isEmail
          ? "Email already exists"
          : "Phone number already exists",
      });
    }

    // HASH PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    // GENERATE REFERRAL CODE
    const generatedReferralCode =
      "AFR" +
      Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

    // CHECK REFERRER
    let referredBy = null;

    if (referralCode) {
      const referrer = await User.findOne({
        referralCode: referralCode.trim(),
      });

      if (referrer) {
        referredBy = referrer._id;
      }
    }

    // CREATE USER
    const userData = {
      name: name.trim(),
      password: hashedPassword,
      referralCode: generatedReferralCode,
      referredBy,
    };

    // Only add the identifier that was actually supplied.
    // We do NOT create email: "" or phone: "".
    if (isEmail) {
      userData.email = cleanIdentifier.toLowerCase();
    } else {
      userData.phone = cleanIdentifier;
    }

    const user = await User.create(userData);

    // CREATE WALLET
    await Wallet.create({
      user: user._id,
    });

    // REFERRAL REWARD
    if (referredBy) {
      await addPoints(
        referredBy,
        500,
        "referral"
      );
    }

    // CREATE LOGIN TOKEN
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.status(201).json({
      message: "Registration successful",
      token,

      user: {
        _id: user._id,
        name: user.name,
        email: user.email || "",
        phone: user.phone || "",
        profilePic: user.profilePic || "",
        referralCode: user.referralCode,
      },
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);

    return res.status(500).json({
      error: "Server error",
      message: err.message,
    });
  }
});


/* ================= LOGIN ================= */

router.post("/login", async (req, res) => {
  const {
    identifier,
    password,
  } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({
      error: "Email/phone and password are required",
    });
  }

  try {
    const cleanIdentifier = identifier.trim();

    const isEmail = cleanIdentifier.includes("@");

    const query = isEmail
      ? { email: cleanIdentifier.toLowerCase() }
      : { phone: cleanIdentifier };

    const user = await User.findOne(query);

    if (!user) {
      return res.status(400).json({
        error: "Invalid credentials",
      });
    }

    // IMPORTANT:
    // NO EMAIL VERIFICATION CHECK HERE.
    //
    // Users can log in immediately after registration.

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        error: "Invalid credentials",
      });
    }

    // CREATE TOKEN
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.json({
      message: "Login successful",
      token,

      user: {
        _id: user._id,
        name: user.name,
        email: user.email || "",
        phone: user.phone || "",
        profilePic: user.profilePic || "",
      },
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);

    return res.status(500).json({
      error: "Server error",
    });
  }
});


/* ================= FORGOT PASSWORD ================= */

router.post(
  "/forgot-password",
  async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email is required",
      });
    }

    try {
      const user = await User.findOne({
        email: email.trim().toLowerCase(),
      });

      if (!user) {
        return res.status(404).json({
          error: "User not found",
        });
      }

      // GENERATE RESET TOKEN
      const token = crypto
        .randomBytes(32)
        .toString("hex");

      user.resetToken = token;

      user.resetTokenExpiry =
        Date.now() + 3600000;

      await user.save();

      const resetUrl =
        `https://africsocial.globelynks.com/reset-password/${token}`;

      await sendEmail({
        to: user.email,

        subject:
          "AfricSocial Password Reset",

        html: `
          <h2>Password Reset</h2>

          <p>
            Click the link below to reset
            your AfricSocial password:
          </p>

          <a href="${resetUrl}">
            ${resetUrl}
          </a>
        `,
      });

      return res.json({
        message:
          "Password reset email sent!",
      });

    } catch (err) {
      console.error(
        "FORGOT PASSWORD ERROR:",
        err
      );

      return res.status(500).json({
        error: "Server error",
      });
    }
  }
);


/* ================= RESET PASSWORD ================= */

router.post(
  "/reset-password/:token",
  async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: "Password is required",
      });
    }

    try {
      const user = await User.findOne({
        resetToken: token,

        resetTokenExpiry: {
          $gt: Date.now(),
        },
      });

      if (!user) {
        return res.status(400).json({
          error:
            "Invalid or expired token",
        });
      }

      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );

      user.password =
        hashedPassword;

      user.resetToken = null;

      user.resetTokenExpiry = null;

      await user.save();

      return res.json({
        message:
          "Password reset successful!",
      });

    } catch (err) {
      console.error(
        "RESET PASSWORD ERROR:",
        err
      );

      return res.status(500).json({
        error: "Server error",
      });
    }
  }
);


/* ================= DELETE USERS ================= */

router.get(
  "/delete-all-users",
  async (req, res) => {
    await User.deleteMany({});

    res.json({
      message: "All users deleted",
    });
  }
);


export default router;