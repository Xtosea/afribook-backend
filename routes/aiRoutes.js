import express from "express";
import { getEffectUrl }
from "../utils/cloudinaryEffects.js";

const router = express.Router();

router.post(
  "/effect",
  async (req, res) => {
    try {
      const {
        imageUrl,
        effect,
      } = req.body;

      if (!imageUrl) {
        return res.status(400).json({
          error:
            "No image URL provided",
        });
      }

      const processedUrl =
        getEffectUrl(
          imageUrl,
          effect
        );

      res.json({
        success: true,
        processedUrl,
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error:
          "AI effect failed",
      });
    }
  }
);

export default router;