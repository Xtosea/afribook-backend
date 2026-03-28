// src/config/env.js
import dotenv from "dotenv";
dotenv.config();

// Cloudflare R2
export const R2_BUCKET = process.env.R2_BUCKET;
export const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
export const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

// Other backend env
export const MONGO_URI = process.env.MONGO_URI;
export const JWT_SECRET = process.env.JWT_SECRET;