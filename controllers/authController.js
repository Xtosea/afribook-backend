import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Wallet from "../models/Wallet.js";

// ================= REGISTER =================

export const register = async (req, res) => {
  console.log("Register body:", req.body);

  try {
    const {
      name,
      identifier,
      password,
      ref,
    } = req.body;

    if (!name || !identifier || !password) {
      return res.status(400).json({
        message:
          "Name, email or phone, and password are required",
      });
    }

    const cleanIdentifier = identifier.trim();

    const isEmail = cleanIdentifier.includes("@");

    // Normalize email
    const normalizedEmail = isEmail
      ? cleanIdentifier.toLowerCase()
      : null;

    const normalizedPhone = !isEmail
      ? cleanIdentifier
      : null;

    // ================= CHECK EXISTING USER =================

    const userExists = await User.findOne(
      isEmail
        ? { email: normalizedEmail }
        : { phone: normalizedPhone }
    );

    if (userExists) {
      return res.status(400).json({
        message: isEmail
          ? "Email already exists"
          : "Phone number already exists",
      });
    }

    // ================= HASH PASSWORD =================

    const hashedPassword =
      await bcrypt.hash(password, 10);

    // ================= GENERATE REFERRAL CODE =================

    const referralCode =
      "AFR" +
      Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

    // ================= CHECK REFERRER =================

    let referredBy = null;

    if (ref) {
      const referrer = await User.findOne({
        referralCode: ref.trim(),
      });

      if (referrer) {
        referredBy = referrer._id;
      }
    }

    // ================= CREATE USER =================

    const userData = {
      name: name.trim(),
      password: hashedPassword,
      referralCode,
      referredBy,
    };

    // Only save the identifier that was supplied.
    // Do NOT save email: "" or phone: "".

    if (isEmail) {
      userData.email = normalizedEmail;
    } else {
      userData.phone = normalizedPhone;
    }

    const user = await User.create(userData);

    // ================= CREATE WALLET =================

    await Wallet.create({
      user: user._id,
    });

    // ================= CREATE LOGIN TOKEN =================

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

  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
};


// ================= LOGIN =================

export const login = async (req, res) => {
  try {
    const {
      identifier,
      password,
    } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        message:
          "Email/phone and password are required",
      });
    }

    const cleanIdentifier =
      identifier.trim();

    const isEmail =
      cleanIdentifier.includes("@");

    const user = await User.findOne(
      isEmail
        ? {
            email:
              cleanIdentifier.toLowerCase(),
          }
        : {
            phone: cleanIdentifier,
          }
    );

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    // IMPORTANT:
    // There is NO isVerified check.
    // Email verification is no longer mandatory.

    const match =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!match) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

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

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
};