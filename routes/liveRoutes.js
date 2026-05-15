router.post(
  "/gift",
  verifyToken,
  async (req, res) => {
    try {

      const {
        streamId,
        receiverId,
        giftType,
        diamonds,
      } = req.body;

      const sender =
        await User.findById(
          req.user._id
        );

      if (
        sender.coins <
        diamonds
      ) {
        return res.status(400).json({
          error:
            "Not enough coins",
        });
      }

      sender.coins -=
        diamonds;

      await sender.save();

      const receiver =
        await User.findById(
          receiverId
        );

      receiver.diamonds +=
        diamonds;

      await receiver.save();

      const gift =
        await Gift.create({
          sender:
            sender._id,

          receiver:
            receiver._id,

          stream:
            streamId,

          giftType,

          diamonds,
        });

      io.to(streamId).emit(
        "new-gift",
        gift
      );

      res.json({
        success: true,
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error:
          "Gift failed",
      });
    }
  }
);