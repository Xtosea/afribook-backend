import express from "express";
import Message from "../models/Message.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { sendNotification } from "../utils/sendNotification.js";
import User from "../models/User.js";
import { getIO } from "../utils/socket.js";


const router = express.Router();


const messages =
  await Message.find({
    $or: [
      {
        sender: req.user.id,
        receiver: userId,
      },
      {
        sender: userId,
        receiver: req.user.id,
      },
    ],

    deletedFor: {
      $ne: req.user.id,
    },
  });


/* ================= SEND MESSAGE ================= */
router.post("/", verifyToken, async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("USER:", req.user);

    const { receiver, text, media, mediaType } = req.body;

    if (!receiver) {
      return res.status(400).json({
        error: "Receiver is required",
      });
    }

    const senderId =
      req.user._id || req.user.id;

    const messageData = {
      sender: senderId,
      receiver,
      text: text || "",
    };

    // Only add media fields when media exists
    if (media) {
      messageData.media = media;
      messageData.mediaType = mediaType;
    }

    const message =
      await Message.create(messageData);

    const populatedMessage =
      await Message.findById(message._id)
        .populate(
          "sender",
          "name profilePic"
        );

    try {
      const senderUser =
        await User.findById(senderId)
          .select("name");

      await sendNotification({
        recipient: receiver,
        sender: senderId,
        type: "MESSAGE",
        text: `${
          senderUser?.name || "Someone"
        } sent you a message`,
      });
    } catch (notificationError) {
      console.log(
        "NOTIFICATION ERROR:",
        notificationError
      );
    }

    return res.json(
      populatedMessage
    );
  } catch (err) {
  console.log("========== MESSAGE ERROR ==========");
  console.log(err);
  console.log("MESSAGE:", err.message);
  console.log("STACK:", err.stack);

  return res.status(500).json({
    error: "Failed to send message",
    details: err.message,
  });
}
});
/* ================= GET MESSAGES ================= */
router.get("/:userId", verifyToken, async (req, res) => {
  try {
    const currentUserId = req.user._id || req.user.id;

    const messages = await Message.find({
      $or: [
        {
          sender: currentUserId,
          receiver: req.params.userId,
        },
        {
          sender: req.params.userId,
          receiver: currentUserId,
        },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("sender", "name profilePic");

    return res.json(messages);
  } catch (err) {
    console.log("LOAD MESSAGE ERROR:", err);

    return res.status(500).json({
      error: "Failed to load messages",
    });
  }
});



router.put(
  "/:id",
  verifyToken,
  async (req, res) => {

    try {

      const message =
        await Message.findById(req.params.id);


      if (!message) {
        return res.status(404).json({
          error:"Message not found"
        });
      }


      if (
        message.sender.toString() !==
        req.user.id
      ) {
        return res.status(403).json({
          error:"Not allowed"
        });
      }


      message.text = req.body.text;
      message.edited = true;
      message.updatedAt = new Date();


      await message.save();


      const io = getIO();

      io?.emit(
        "message-edited",
        message
      );


      res.json(message);


    } catch(err){

      console.log(err);

      res.status(500).json({
        error:"Edit failed"
      });

    }
});


router.delete(
  "/:id/me",
  verifyToken,
  async (req, res) => {

    const message =
      await Message.findById(
        req.params.id
      );

    if (!message) {
      return res.status(404).json({
        error: "Message not found",
      });
    }

    if (
      ![
        message.sender.toString(),
        message.receiver.toString(),
      ].includes(req.user.id)
    ) {
      return res.status(403).json({
        error: "Not allowed",
      });
    }

    message.deletedFor.push(
      req.user.id
    );

    await message.save();

    res.json({
      success: true,
    });
  }
);


router.delete(
  "/:id/everyone",
  verifyToken,
  async (req,res)=>{

    try {

      const message =
        await Message.findById(
          req.params.id
        );


      if(!message){
        return res.status(404).json({
          error:"Message not found"
        });
      }


      if(
        message.sender.toString()
        !== req.user.id
      ){
        return res.status(403).json({
          error:"Not allowed"
        });
      }



      const oneHour =
        60 * 60 * 1000;


      const age =
        Date.now() -
        new Date(
          message.createdAt
        ).getTime();


      if(age > oneHour){

        return res.status(400).json({
          error:
          "You can only delete messages within 1 hour"
        });

      }



      await Message.findByIdAndDelete(
        req.params.id
      );


      const io = getIO();


      io?.emit(
        "message-deleted",
        {
          messageId:req.params.id
        }
      );


      res.json({
        success:true
      });


    }catch(err){

      console.log(err);

      res.status(500).json({
        error:"Delete failed"
      });

    }

});


export default router;