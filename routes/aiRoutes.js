import express from "express";

const router = express.Router();

// TEMP MOCK AI ENHANCE (we upgrade later)
router.post("/enhance", async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: "No image provided" });
    }

    // MOCK RESPONSE (replace later with real AI)
    const enhancedUrl = imageUrl; // placeholder

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