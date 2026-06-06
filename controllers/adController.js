import AdCampaign from "../models/AdCampaign.js";
import AdImpression from "../models/AdImpression.js";
import CreatorRevenue from "../models/CreatorRevenue.js";
import Wallet from "../models/Wallet.js";
import CreatorEarning
from "../models/CreatorEarning.js";


const COST_PER_VIEW = 2;
const CREATOR_SHARE = 0.7;

/* ================= CREATE CAMPAIGN ================= */

export const createCampaign = async (req, res) => {
  try {
    const {
      title,
      description,
      mediaUrl,
      adType,
      budget,
    } = req.body;

    if (!title || !budget) {
      return res.status(400).json({
        error: "Title and budget required",
      });
    }

    const campaign =
      await AdCampaign.create({
        advertiser: req.user.id,
        title,
        description,
        mediaUrl,
        adType,
        budget,
        remainingBudget: budget,
      });

    res.status(201).json(campaign);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to create campaign",
    });
  }
};

/* ================= MY CAMPAIGNS ================= */

export const getMyCampaigns = async (
  req,
  res
) => {
  try {
    const campaigns =
      await AdCampaign.find({
        advertiser: req.user.id,
      }).sort({
        createdAt: -1,
      });

    res.json(campaigns);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to load campaigns",
    });
  }
};

/* ================= SERVE AD ================= */

export const serveAd = async (
  req,
  res
) => {
  try {
    const ads =
      await AdCampaign.aggregate([
        {
          $match: {
            status: "active",

            remainingBudget: {
              $gt: 0,
            },
          },
        },

        {
          $sample: {
            size: 1,
          },
        },
      ]);

    if (!ads.length) {
      return res.json(null);
    }

    res.json(ads[0]);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to serve ad",
    });
  }
};

/* ================= RECORD IMPRESSION ================= */

export const recordImpression =
  async (req, res) => {
    try {
      const {
        campaignId,
        creatorId,
        postId,
      } = req.body;

          if (
  creatorId?.toString() ===
  req.user.id?.toString()
) {
  return res.status(400).json({
    error:
      "Self views not allowed",
  });
}


      const campaign =
        await AdCampaign.findById(
          campaignId
        );

      if (!campaign) {
        return res.status(404).json({
          error: "Campaign not found",
        });
      }

      if (
        campaign.remainingBudget <
        COST_PER_VIEW
      ) {
        return res.status(400).json({
          error:
            "Campaign budget exhausted",
        });
      }

      campaign.impressions += 1;

      campaign.spent +=
        COST_PER_VIEW;

      campaign.remainingBudget -=
        const COST_PER_VIEW =
  campaign.costPerView;

      await campaign.save();

      const creatorEarned =
  COST_PER_VIEW *
  CREATOR_SHARE;

      await AdImpression.create({
        campaign: campaignId,
        creator: creatorId,
        viewer: req.user.id,
        post: postId,
        valid: true,
      });

      await CreatorEarning.create({
  creator: creatorId,
  campaign: campaignId,
  impressionId:
    impression._id,
  amount:
    creatorEarned,
});

      await CreatorRevenue.create({
  creator: creatorId,
  campaign: campaignId,
  post: postId,
  impressions: 1,
  earnings: creatorEarned,
});

      res.json({
        success: true,
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error:
          "Failed to record impression",
      });
    }
  };

/* ================= RECORD CLICK ================= */

export const recordClick = async (
  req,
  res
) => {
  try {
    const { campaignId } =
      req.body;

    const campaign =
      await AdCampaign.findById(
        campaignId
      );

    if (!campaign) {
      return res.status(404).json({
        error: "Campaign not found",
      });
    }

    campaign.clicks += 1;

    await campaign.save();

    res.json({
      success: true,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to record click",
    });
  }
};

/* ================= CAMPAIGN ANALYTICS ================= */

export const getCampaignAnalytics =
async (req, res) => {
  try {
    const campaign =
      await AdCampaign.findOne({
        _id: req.params.id,
        advertiser: req.user.id,
      });

    if (!campaign) {
      return res.status(404).json({
        error: "Campaign not found",
      });
    }

    const ctr =
      campaign.impressions > 0
        ? (
            (campaign.clicks /
              campaign.impressions) *
            100
          ).toFixed(2)
        : 0;

    res.json({
      title: campaign.title,
      budget: campaign.budget,
      remainingBudget:
        campaign.remainingBudget,
      spent: campaign.spent,
      impressions:
        campaign.impressions,
      clicks: campaign.clicks,
      ctr,
      status: campaign.status,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to load analytics",
    });
  }
};


export const pauseCampaign =
async (req, res) => {
  try {
    const campaign =
      await AdCampaign.findOne({
        _id: req.params.id,
        advertiser: req.user.id,
      });

    if (!campaign) {
      return res.status(404).json({
        error: "Campaign not found",
      });
    }

    campaign.status = "paused";

    await campaign.save();

    res.json({
      success: true,
      status: campaign.status,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to pause",
    });
  }
};

export const resumeCampaign =
async (req, res) => {
  try {
    const campaign =
      await AdCampaign.findOne({
        _id: req.params.id,
        advertiser: req.user.id,
      });

    if (!campaign) {
      return res.status(404).json({
        error: "Campaign not found",
      });
    }

    campaign.status = "active";

    await campaign.save();

    res.json({
      success: true,
      status: campaign.status,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to resume",
    });
  }
};

  export const deleteCampaign =
async (req, res) => {
  try {
    const campaign =
      await AdCampaign.findOneAndDelete({
        _id: req.params.id,
        advertiser: req.user.id,
      });

    if (!campaign) {
      return res.status(404).json({
        error: "Campaign not found",
      });
    }

    res.json({
      success: true,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to delete",
    });
  }
};


