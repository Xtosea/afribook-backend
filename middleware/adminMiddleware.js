// middleware/adminMiddleware.js

import User from "../models/User.js";

export const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        error: "Admin access required",
      });
    }

    next();

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Admin check failed",
    });
  }
};

// Alias (optional)
export const adminMiddleware = isAdmin;
