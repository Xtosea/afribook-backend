import express from "express";
import multer from "multer";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

router.post(
  "/enhance",
  upload.single("image"),
  async (req, res) => {

    try {

      if (!req.file) {
        return res.status(400).json({
          error: "Image required",
        });
      }

      const base64 =
        req.file.buffer.toString("base64");

      const result = `data:${req.file.mimetype};base64,${base64}`;

      // CLOUDINARY AI URL
      const enhancedUrl =
        result.replace(
          "/upload/",
          "/upload/e_sharpen,e_improve/"
        );

      res.json({
        url: enhancedUrl,
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error: "Enhance failed",
      });

    }

  }
);

export default router;