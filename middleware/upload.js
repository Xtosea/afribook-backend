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

  console.log("🔥 RAW FILES FROM MULTER:", req.files); // 👈 ADD HERE

  if (!req.files || req.files.length === 0) {
    req.files = [];
    return next();
  }

  const processed = [];

  for (const file of req.files) {
    const mime = file.mimetype;

    try {
      if (mime.startsWith("image/")) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "posts",
        });

        processed.push({
          url: result.secure_url,
          type: "image",
        });

      } else if (mime.startsWith("video/")) {
        const R2_BUCKET = process.env.R2_BUCKET;
        const R2_URL = `https://${R2_BUCKET}.r2.cloudflarestorage.com/${file.filename}`;
        const R2_AUTH = `Bearer ${process.env.R2_TOKEN}`;

        await fetch(R2_URL, {
          method: "PUT",
          body: fs.createReadStream(file.path),
          headers: { Authorization: R2_AUTH },
        });

        processed.push({
          url: R2_URL,
          type: "video",
        });
      }
    } catch (err) {
      console.error("MEDIA UPLOAD ERROR:", err);
    }

    fs.unlinkSync(file.path);
  }

  console.log("✅ PROCESSED MEDIA:", processed); // 👈 ADD HERE

  req.files = processed;
  next();
};