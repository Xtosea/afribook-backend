// controllers/giftController.js

import Gift from "../models/Gift.js";

import {
  sendPKGift,
} from "../services/pkGiftService.js";


// ==========================================
// GET ACTIVE GIFTS
// GET /api/gifts
// ==========================================

export const getGiftsController = async (
  req,
  res
) => {

  try {

    const gifts =
      await Gift.find({
        active: true,
      })
        .sort({
          sortOrder: 1,
          coinCost: 1,
        })
        .select(
          "_id name emoji coinCost pkPoints diamonds sortOrder"
        )
        .lean();


    return res.json({
      success: true,
      gifts,
    });


  } catch (error) {

    console.error(
      "Get gifts error:",
      error
    );


    return res.status(500).json({
      success: false,
      message:
        "Failed to load gifts",
    });

  }
};


// ==========================================
// SEND PK GIFT
// POST /api/gifts/pk
// ==========================================

export const sendPKGiftController = async (
  req,
  res
) => {

  try {

    const {
      battleId,
      receiverId,
      giftId,
    } = req.body;


    const senderId =
      req.user?._id ||
      req.user?.id;


    if (!senderId) {

      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });

    }


    const result =
      await sendPKGift({
        senderId,
        battleId,
        receiverId,
        giftId,
      });


    return res.json({

      success: true,

      message:
        "Gift sent successfully",

      data: result,

    });


  } catch (error) {

    console.error(
      "Send PK gift error:",
      error
    );


    return res.status(400).json({

      success: false,

      message:
        error.message ||
        "Failed to send gift",

    });

  }
};