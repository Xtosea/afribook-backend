// controllers/cloudinaryController.js
import cloudinary from "../config/cloudinary.js";
import fs from "fs";



export const uploadPostImage = async (req, res) => {
  try {
    console.log("FILE:", req.file);

    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded",
      });
    }

    const result = await cloudinary.uploader.upload(
      req.file.path,
      {
        folder: "afribook/stories",
        resource_type: "auto",
      }
    );

    fs.unlinkSync(req.file.path);

    return res.json({
      url: result.secure_url,
    });

  } catch (err) {
    console.error("CLOUDINARY ERROR:");
    console.error(err);

    return res.status(500).json({
      error: err.message,
      cloudinaryError: err,
    });
  }
};