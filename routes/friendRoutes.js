import express from "express";
import User from "../models/User.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import Notification from "../models/Notification.js";
import { io } from "../server.js";
import { sendNotification } from "../utils/sendNotification.js";

const router = express.Router();

/* ================= SEND REQUEST ================= */
router.post("/request/:id", verifyToken, async (req, res) => {
  try {
    const senderId = req.user.id;
    const receiverId = req.params.id;

    if (senderId === receiverId) {
      return res
        .status(400)
        .json({ error: "Cannot add yourself" });
    }

    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);

    if (!receiver) {
      return res
        .status(404)
        .json({ error: "User not found" });
    }

    if (
      receiver.friendRequests.includes(senderId)
    ) {
      return res
        .status(400)
        .json({ error: "Request already sent" });
    }

    receiver.friendRequests.push(senderId);

    sender.sentRequests.push(receiverId);

    await receiver.save();
    await sender.save();

    await sendNotification({
  recipient: receiverId,
  sender: req.user.id,
  type: "FRIEND_REQUEST",
  text: "sent you a friend request",
});

   
    res.json({
      message: "Friend request sent",
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Server error",
    });

  }
});

/* ================= GET REQUESTS ================= */
router.get("/requests", verifyToken, async (req, res) => {
  try {

    const user = await User.findById(req.user.id)
      .populate(
        "friendRequests",
        "name profilePic"
      );

    res.json(user.friendRequests);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Server error",
    });

  }
});

/* ================= ACCEPT REQUEST ================= */
router.post("/accept/:id", verifyToken, async (req, res) => {
  try {

    const currentUser = await User.findById(req.user.id);

    const requester = await User.findById(
      req.params.id
    );

    currentUser.friends.push(requester._id);

    requester.friends.push(currentUser._id);

    currentUser.friendRequests =
      currentUser.friendRequests.filter(
        (id) =>
          id.toString() !==
          requester._id.toString()
      );

    requester.sentRequests =
      requester.sentRequests.filter(
        (id) =>
          id.toString() !==
          currentUser._id.toString()
      );

    await currentUser.save();
    await requester.save();

await sendNotification({
  recipient: requester._id,
  sender: req.user.id,
  type: "FRIEND_ACCEPT",
  text: "accepted your friend request",
});


    

    res.json({
     message: "Friend request accepted",
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Server error",
    });

  }
});



router.get(
  "/suggestions",
  verifyToken,
  async (req, res) => {
    try {

      const currentUser =
        await User.findById(req.user.id);

      if (!currentUser) {
        return res.status(404).json({
          error: "User not found",
        });
      }

      // Exclude:
      // - yourself
      // - already friends
      // - already requested

      const excludedIds = [
        currentUser._id,

        ...(currentUser.friends || []),

        ...(currentUser.sentRequests || []),
      ];

      const users = await User.find({
        _id: {
          $nin: excludedIds,
        },
      })
        .select(
          "name profilePic bio"
        )
        .sort({ createdAt: -1 })
        .limit(50);

      res.json(users);

    } catch (err) {

      console.error(
        "SUGGESTIONS ERROR:",
        err
      );

      res.status(500).json({
        error: "Server error",
      });

    }
  }
);

/*========================================
   GET FRIEND LIST
========================================= */

router.get(
  "/list",
  verifyToken,
  async (req, res) => {
    try {
      const user = await User.findById(
        req.user.id
      ).populate(
        "friends",
        "name profilePic bio"
      );

      res.json(user.friends);
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Server error",
      });
    }
  }
);

router.post("/sync-contacts", verifyToken, async (req, res) => {
  try {

    const { contacts } = req.body;

    const users = await User.find({
      phone: { $in: contacts }
    }).select("name profilePic");

    res.json(users);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

export default router;