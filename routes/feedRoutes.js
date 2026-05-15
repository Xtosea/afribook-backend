router.get(
  "/foryou",
  verifyToken,
  async (req, res) => {

    try {

      const user =
        await User.findById(
          req.user._id
        );

      let reels =
        await Post.find({
          type: "reel",
        })
          .populate("user");

      reels = reels.map(
        (reel) => ({
          ...reel.toObject(),

          score:
            calculateFeedScore({
              reel,
              user,
            }),
        })
      );

      reels.sort(
        (a, b) =>
          b.score - a.score
      );

      res.json(reels);

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to generate feed",
      });
    }
  }
);