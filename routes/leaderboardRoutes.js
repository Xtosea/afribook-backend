import express from "express";
import Wallet from "../models/Wallet.js";

const router = express.Router();

/* ================= TOP USERS LEADERBOARD ================= */

router.get("/top", async (req, res) => {
  try {

    const topUsers =
      await Wallet.find()
        .sort({ points: -1 })
        .limit(20)
        .populate(
          "user",
          "name profilePic intro"
        );

    const formatted =
      topUsers.map((wallet, index) => ({
        rank: index + 1,

        userId:
          wallet.user?._id,

        name:
          wallet.user?.name,

        profilePic:
          wallet.user?.profilePic,

        intro:
          wallet.user?.intro,

        points:
          wallet.points,

        balance:
          wallet.balance,
      }));

    res.json(formatted);

  } catch (err) {

    console.error(
      "LEADERBOARD ERROR:",
      err
    );

    res.status(500).json({
      error: "Server error",
    });
  }
});

export default router;