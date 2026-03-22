// controllers/cloudinaryController.js
import cloudinary from "../config/cloudinary.js";
import fs from "fs";

export const uploadPostImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "afribook/posts",
      resource_type: "image",
    });

    // Delete local temp file
    fs.unlinkSync(req.file.path);

    res.json({ url: result.secure_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};