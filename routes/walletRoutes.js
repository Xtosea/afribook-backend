router.get(
  "/",
  verifyToken,
  async (req, res) => {
    try {
      const wallet =
        await Wallet.findOne({
          user: req.user._id,
        });

      res.json(wallet);
    } catch (err) {
      res.status(500).json({
        error: "Failed to get wallet",
      });
    }
  }
);