import express from "express";

const router = express.Router();

router.post("/enhance", async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: "No image URL provided" });
    }

    // 🔥 REAL AI PLACEHOLDER (we will upgrade later)
    const enhancedUrl = imageUrl; // for now

    res.json({
      success: true,
      enhancedUrl,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI enhance failed" });
  }
});

export default router;