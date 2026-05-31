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


const withdrawal = await Withdrawal.create({
  user: req.user.id,
  amount,
  bankName,
  accountNumber,
  accountName,
  status: "pending",
});

res.json({
  success: true,
  message: "Withdrawal submitted",
  withdrawal,
});


router.put("/withdrawals/:id/approve", async (req, res) => {
  const withdrawal =
    await Withdrawal.findById(req.params.id);

  withdrawal.status = "approved";

  await withdrawal.save();

  await sendNotification({
    recipient: withdrawal.user,
    type: "WITHDRAWAL_APPROVED",
    text: "Your withdrawal has been approved",
  });

  res.json({ success: true });
});

