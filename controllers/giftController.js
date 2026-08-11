import Gift from "../models/Gift.js";

// ==========================================
// GET ACTIVE GIFTS
// GET /api/gifts
// ==========================================

export const getGiftsController = async (req, res) => {
  try {
    const gifts = await Gift.find({
      active: true,
    })
      .sort({
        sortOrder: 1,
        coinCost: 1,
      })
      .select(
        "_id name emoji coinCost pkPoints sortOrder"
      )
      .lean();

    return res.json({
      success: true,
      gifts,
    });
  } catch (error) {
    console.error("Get gifts error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load gifts",
    });
  }
};