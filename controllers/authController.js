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

    if (!name || !password) {
      return res.status(400).json({
        message: "Name and password are required",
      });
    }

    const isEmail =
      identifier && identifier.includes("@");

    let userExists = null;

    if (identifier) {
      userExists = await User.findOne(
        isEmail
          ? { email: identifier }
          : { phone: identifier }
      );

      if (userExists) {
        return res.status(400).json({
          message: isEmail
            ? "Email already exists"
            : "Phone number already exists",
        });
      }
    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    // Generate referral code
    const referralCode =
      "AFR" +
      Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

    // Check who referred this user
    let referredBy = null;

    if (ref) {
      const referrer =
        await User.findOne({
          referralCode: ref,
        });

      if (referrer) {
        referredBy = referrer._id;
      }
    }

    const user = await User.create({
      name,
      email: isEmail ? identifier : "",
      phone:
        identifier && !isEmail
          ? identifier
          : "",
      password: hashedPassword,

      referralCode,
      referredBy,
    });

    await Wallet.create({
      user: user._id,
    });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET
    );

    res.json({
      token,
      user,
    });

  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

// ================= LOGIN =================

export const login = async (req, res) => {
  try {
    const { identifier, password } =
      req.body;

    const isEmail =
      identifier && identifier.includes("@");

    const user = await User.findOne(
      isEmail
        ? { email: identifier }
        : { phone: identifier }
    );

    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    const match =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!match) {
      return res.status(400).json({
        message: "Wrong password",
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET
    );

    res.json({
      token,
      user,
    });

  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};



await Wallet.create({
  user: newUser._id,
});