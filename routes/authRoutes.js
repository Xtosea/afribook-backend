import express from "express";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendEmail } from "../utils/mailer.js";

const router = express.Router();

/* ================= REGISTER ================= */
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const verifyToken = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      verifyToken,
      verifyTokenExpiry: Date.now() + 3600000,
    });

    console.log("Generated token:", verifyToken);
    console.log("Saved user token:", user.verifyToken);

    // ✅ safer during debugging
    // Inside router.post("/register", ...)
const verifyUrl = `http://localhost:3000/verify-email/${verifyToken}?email=${user.email}`;

await sendEmail({
  to: user.email,
  subject: "Verify your Afribook account",
  html: `
    <h2>Welcome to Afribook, ${user.name}</h2>
    <p>Please verify your email:</p>
    <a href="${verifyUrl}" target="_blank">Click here to verify your email</a>
    <p>OR copy & paste this link:</p>
    <p>${verifyUrl}</p>
  `
});

    res.status(201).json({
      message: "Registration successful. Please verify your email.",
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= VERIFY EMAIL ================= */
router.get("/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { email } = req.query; // get email from query string

    let user = await User.findOne({ verifyToken: token });

    if (!user) {
      const alreadyVerifiedUser = await User.findOne({
        email,
        isVerified: true,
      });

      if (alreadyVerifiedUser) {
        return res.json({ message: "User already verified" });
      }

      return res.status(400).json({ error: "Invalid token" });
    }

    if (user.verifyTokenExpiry < Date.now()) {
      return res.status(400).json({ error: "Token expired" });
    }

    user.isVerified = true;
    user.verifyToken = null;
    user.verifyTokenExpiry = null;

    await user.save();

    const authToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Verified successfully",
      token: authToken,
      user: { _id: user._id, email: user.email },
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= LOGIN ================= */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        error: "Please verify your email before logging in",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ✅ CLEAN RESPONSE
    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= RESEND VERIFICATION ================= */
router.post("/resend-verification", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: "Email already verified" });
    }

    const verifyToken = crypto.randomBytes(32).toString("hex");

    user.verifyToken = verifyToken;
    user.verifyTokenExpiry = Date.now() + 3600000;

    await user.save();

    const verifyUrl = `http://localhost:3000/verify-email/${verifyToken}`;

    await sendEmail({
      to: user.email,
      subject: "Verify your Afribook account",
      html: `
        <h2>Email Verification</h2>
        <p>Click the link below to verify your account:</p>
        <a href="${verifyUrl}">${verifyUrl}</a>
      `,
    });

    res.json({ message: "Verification email resent" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= FORGOT PASSWORD ================= */
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const token = crypto.randomBytes(32).toString("hex");

    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 3600000;

    await user.save();

    const resetUrl = `http://localhost:3000/reset-password/${token}`;

    await sendEmail({
      to: user.email,
      subject: "Afribook Password Reset",
      html: `
        <h2>Password Reset</h2>
        <p>Click the link below:</p>
        <a href="${resetUrl}">${resetUrl}</a>
      `,
    });

    res.json({ message: "Password reset email sent!" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


router.get("/delete-all-users", async (req, res) => {
  await User.deleteMany({});
  res.json({ message: "All users deleted" });
});

/* ================= RESET PASSWORD ================= */
router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;

    await user.save();

    res.json({ message: "Password reset successful!" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;