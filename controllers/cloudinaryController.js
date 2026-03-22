import cloudinary from "../config/cloudinary.js";
import fs from "fs";

export const uploadPostImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image provided" });

  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "posts",
      resource_type: "image",
    });

    // Remove temp file
    fs.unlinkSync(req.file.path);

    res.json({
      message: "Image uploaded to Cloudinary",
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Cloudinary upload failed" });
  }
};