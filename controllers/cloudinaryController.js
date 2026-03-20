// /controllers/cloudinaryController.js
import cloudinary from "../config/cloudinary.js";

export const uploadPostImage = async (req, res) => {
  try {
    const file = req.file;

    const result = await cloudinary.uploader.upload(file.path, {
      folder: "posts",
    });

    res.json({ url: result.secure_url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};