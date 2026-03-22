// middleware/upload.js
import multer from "multer";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import FormData from "form-data";
import fetch from "node-fetch";
import ImageKit from "imagekit";

// ---------- TEMP STORAGE ----------
const tmpDir = path.join(process.cwd(), "tmp");
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tmpDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

// Multer for local temp storage
export const uploadLocal = multer({ storage });

// ---------- CLOUDINARY SETUP ----------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ---------- CLOUDINARY + R2 UPLOAD MIDDLEWARE ----------
export const uploadMediaCloudinaryR2 = multer({ storage }).any(); 
// use .any() for multiple files, no .array() needed in route

export const mediaHandler = async (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();

  const processed = [];

  try {
    for (const file of req.files) {
      const mime = file.mimetype;

      if (mime.startsWith("image/")) {
        // Upload images to Cloudinary
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "posts",
          use_filename: true,
          unique_filename: false,
        });
        processed.push({ url: result.secure_url, type: "image" });

      } else if (mime.startsWith("video/")) {
        // Upload videos to Cloudflare R2
        const R2_BUCKET = process.env.R2_BUCKET;
        const R2_AUTH = `Bearer ${process.env.R2_TOKEN}`;
        const R2_URL = `https://${R2_BUCKET}.r2.cloudflarestorage.com/${file.filename}`;

        await fetch(R2_URL, {
          method: "PUT",
          body: fs.createReadStream(file.path),
          headers: { Authorization: R2_AUTH },
        });

        processed.push({ url: R2_URL, type: "video" });
      }

      // Remove temp file
      fs.unlinkSync(file.path);
    }

    req.files = processed;
    next();
  } catch (err) {
    console.error("MEDIA HANDLER ERROR:", err);
    res.status(500).json({ error: "Media upload failed" });
  }
};

// ---------- IMAGEKIT FOR PROFILE / COVER PICS ----------
export const imageKit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

// Upload single profile or cover pic
export const uploadProfileCover = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const response = await imageKit.upload({
      file: req.file.buffer,
      fileName: `${Date.now()}-${req.file.originalname}`,
      folder: "/profiles",
    });

    res.json({ url: response.url });
  } catch (err) {
    console.error("IMAGEKIT UPLOAD ERROR:", err);
    res.status(500).json({ error: "ImageKit upload failed" });
  }
};