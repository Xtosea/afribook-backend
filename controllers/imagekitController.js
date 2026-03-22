// controllers/imagekitController.js
import imagekit from "../config/imagekit.js";

export const uploadImageKit = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const result = await imagekit.upload({
      file: req.file.buffer,
      fileName: req.file.originalname,
      folder: "/afribook",
    });

    res.json({ url: result.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};