// ================= GET STORIES =================
router.get("/", verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || "20");

    const stories = await Story.find({
      expiresAt: { $gt: new Date() } // only active stories
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("user", "name profilePic");

    res.json({ stories });
  } catch (err) {
    console.error("Fetch stories error:", err);
    res.status(500).json({ error: "Failed to fetch stories" });
  }
});