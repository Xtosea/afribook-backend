import multer from "multer";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import fetch from "node-fetch";

// ================= CLOUDINARY CONFIG =================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ================= TEMP STORAGE =================
const tmpDir = path.join(process.cwd(), "tmp");
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tmpDir),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname),
});

// Accept multiple files
export const uploadMediaCloudinaryR2 = multer({ storage }).any();

// ================= MEDIA HANDLER =================
export const mediaHandler = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      req.files = [];
      return next();
    }

    const processed = [];

    for (const file of req.files) {
      const mime = file.mimetype;

      try {
        // ================= IMAGE → CLOUDINARY =================
        if (mime.startsWith("image/")) {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: "posts",
          });

          console.log("Cloudinary upload success:", result.secure_url);

          processed.push({
            url: result.secure_url,
            type: "image",
          });
        }

        // ================= VIDEO → R2 =================
        else if (mime.startsWith("video/")) {
          const R2_BUCKET = process.env.R2_BUCKET;
          const R2_TOKEN = process.env.R2_TOKEN;

          const R2_URL = `https://${R2_BUCKET}.r2.cloudflarestorage.com/${file.filename}`;

          const response = await fetch(R2_URL, {
            method: "PUT",
            body: fs.createReadStream(file.path),
            headers: {
              Authorization: `Bearer ${R2_TOKEN}`,
              "Content-Type": file.mimetype,
            },
          });

          if (!response.ok) {
            throw new Error("R2 upload failed");
          }

          console.log("R2 upload success:", R2_URL);

          processed.push({
            url: R2_URL,
            type: "video",
          });
        }
      } catch (err) {
        console.error("MEDIA UPLOAD ERROR:", err.message);
      }

      // Delete temp file
      fs.unlinkSync(file.path);
    }

    req.files = processed;

    console.log("FINAL MEDIA ARRAY:", processed);

    next();
  } catch (err) {
    console.error("MEDIA HANDLER ERROR:", err);
    req.files = [];
    next();
  }
};