import Wallet from "../models/Wallet.js";
import CreatorRevenue from "../models/CreatorRevenue.js";
import Withdrawal from "../models/Withdrawal.js";


export const getEarnings =
async (req, res) => {
  try {

    let wallet =
      await Wallet.findOne({
        user: req.user.id,
      });

    if (!wallet) {
      wallet =
        await Wallet.create({
          user: req.user.id,
        });
    }

    res.json({
      creatorBalance:
        wallet.creatorBalance || 0,

      adRevenueEarned:
        wallet.adRevenueEarned || 0,

      adViews:
        wallet.adViews || 0,

      pending:
        wallet.pending || 0,
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error:
        "Failed to load earnings",
    });
  }
};

export const getRevenueHistory =
async (req, res) => {

  try {

    const revenue =
      await CreatorRevenue.find({
        creator: req.user.id,
      })
      .populate(
        "campaign",
        "title"
      )
      .sort({
        createdAt: -1,
      })
      .limit(100);

    res.json(revenue);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error:
        "Failed to load history",
    });
  }
};

export const getAnalytics =
async (req, res) => {

  try {

    const wallet =
      await Wallet.findOne({
        user: req.user.id,
      });

    res.json({
      totalViews:
        wallet?.adViews || 0,

      totalRevenue:
        wallet?.adRevenueEarned || 0,

      currentBalance:
        wallet?.creatorBalance || 0,
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error:
        "Failed to load analytics",
    });
  }
};

export const creatorWithdraw =
async (req, res) => {

  try {

    const {
      amount,
      bankName,
      accountName,
      accountNumber,
    } = req.body;

    const wallet =
      await Wallet.findOne({
        user: req.user.id,
      });

    if (!wallet) {
      return res.status(404).json({
        error:
          "Wallet not found",
      });
    }

    if (
      amount >
      wallet.creatorBalance
    ) {
      return res.status(400).json({
        error:
          "Insufficient balance",
      });
    }

    wallet.creatorBalance -=
      Number(amount);

    wallet.pending =
      (wallet.pending || 0) +
      Number(amount);

    await wallet.save();

    const withdrawal =
      await Withdrawal.create({
        user: req.user.id,
        amount,
        bankName,
        accountName,
        accountNumber,
        type: "creator",
        status: "pending",
      });

    res.json({
      success: true,
      withdrawal,
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error:
        "Withdrawal failed",
    });
  }
};


export const getEligibility =
async (req, res) => {

  const user =
    await User.findById(
      req.user.id
    );

  const requirements = {
    followers: 1000,
    views: 10000,
    accountAge: 30,
  };

  const accountAge =
    Math.floor(
      (
        Date.now() -
        new Date(
          user.createdAt
        )
      ) /
      (
        1000 *
        60 *
        60 *
        24
      )
    );

  const eligible =
    user.followersCount >=
      requirements.followers &&
    user.totalViews >=
      requirements.views &&
    accountAge >=
      requirements.accountAge &&
    user.policyViolations === 0;

  res.json({
    eligible,

    followers:
      user.followersCount,

    views:
      user.totalViews,

    accountAge,

    violations:
      user.policyViolations,

    requirements,
  });
};
