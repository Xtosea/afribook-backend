// controllers/pkController.js

import {
  createPK,
  startPK,
  addPKScore,
  finishPK,
  getPK,
  getPKHistory,
  getPKStats,
} from "../services/pkService.js";

import {
  getPKRoomState,
  deletePKRoom,
} from "../services/pkSocketService.js";


// ===============================
// CREATE PK
// ===============================


export const createPKController = async (req, res) => {
  try {
    const { hostB, duration } = req.body;

    const hostA = req.user?._id || req.user?.id;

    if (!hostA) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!hostB) {
      return res.status(400).json({
        success: false,
        message: "Opponent is required",
      });
    }

    const battle = await createPK(
      hostA,
      hostB,
      duration || 300
    );

    return res.status(201).json({
      success: true,
      message: "PK created successfully",
      battle,
    });

  } catch (error) {
    console.error("Create PK error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create PK",
    });
  }
};


// ===============================
// START PK
// ===============================

export const startPKController = async (req, res) => {
  try {
    const { battleId } = req.params;

    const userId = req.user?.id;

const battle = await startPK(
  battleId,
  userId
);

    return res.json({
      success: true,
      message: "PK started",
      battle,
    });

  } catch (error) {
    console.error("Start PK error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to start PK",
    });
  }
};


// ===============================
// ADD PK SCORE
// ===============================

export const addPKScoreController = async (req, res) => {
  try {
    const { battleId } = req.params;
    const { points } = req.body;

    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const result = await addPKScore(
      battleId,
      userId,
      points
    );

    return res.json({
      success: true,
      message: "PK score updated",
      data: {
        hostAScore: result.hostAScore,
        hostBScore: result.hostBScore,
      },
    });

  } catch (error) {
    console.error("Add PK score error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update PK score",
    });
  }
};


// ===============================
// FINISH PK
// ===============================

export const finishPKController = async (
  req,
  res
) => {

  try {

    const {
      battleId,
    } = req.params;


    const userId =
      req.user?._id ||
      req.user?.id;


    if (!userId) {

      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });

    }


    // ------------------------------------------
    // Get final Redis score
    // ------------------------------------------

    const roomState =
      await getPKRoomState(
        battleId
      );


    // ------------------------------------------
    // Finish using final live score
    // ------------------------------------------

    const result =
  await finishPK(
    battleId,
    userId,
    roomState
  );


    // ------------------------------------------
    // Delete live Redis room
    // ------------------------------------------

    await deletePKRoom(
      battleId
    );


    return res.json({

  success: true,

  message:
    "PK completed",

  battle:
    result.battle,

  reward:
    result.reward,

});


  } catch (error) {

    console.error(
      "Finish PK error:",
      error
    );


    return res.status(400).json({

      success: false,

      message:
        error.message ||
        "Failed to finish PK",

    });

  }

};


// ===============================
// GET PK HISTORY
// GET /api/pk/history
// ===============================

export const getPKHistoryController = async (
  req,
  res
) => {
  try {
    const userId =
      req.user?._id ||
      req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const {
      page = 1,
      limit = 20,
    } = req.query;

    const result =
      await getPKHistory(
        userId,
        page,
        limit
      );

    return res.json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error(
      "Get PK history error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to load PK history",
    });
  }
};



// ===============================
// GET PK STATISTICS
// ===============================

export const getPKStatsController = async (
  req,
  res
) => {
  try {

    const userId =
      req.user?._id ||
      req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const stats =
      await getPKStats(userId);

    return res.json({
      success: true,
      stats,
    });

  } catch (error) {

    console.error(
      "Get PK stats error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to load PK statistics",
    });
  }
};

// ===============================
// GET PK
// ===============================

export const getPKController = async (req, res) => {
  try {
    const { battleId } = req.params;

    const battle = await getPK(battleId);

    return res.json({
      success: true,
      battle,
    });

  } catch (error) {
    console.error("Get PK error:", error);

    return res.status(404).json({
      success: false,
      message: error.message || "PK battle not found",
    });
  }
};