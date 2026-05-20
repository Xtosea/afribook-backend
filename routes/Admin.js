router.put(
  "/approve/:id",
  verifyToken,
  async (req, res) => {

    try {

      const verification =
        await Verification.findById(
          req.params.id
        );

      verification.status =
        "APPROVED";

      await verification.save();

      await User.findByIdAndUpdate(
        verification.user,
        {
          verified: true,

          verificationStatus:
            "APPROVED",
        }
      );

      res.json({
        success: true,
      });

    } catch (err) {

      res.status(500).json({
        error:
          "Approval failed",
      });
    }
  }
);