// server.js
import "./config/env.js";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import multer from "multer";
import http from "http";
import { Server } from "socket.io";
import Redis from "ioredis";
import jwt from "jsonwebtoken";

/* ================= ROUTES ================= */
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import leaderboardRoutes from "./routes/leaderboardRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import storyRoutes from "./routes/storyRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import imagekitRoutes from "./routes/imagekitRoutes.js";
import cloudinaryRoutes from "./routes/cloudinaryRoutes.js";
import videoRoutes from "./routes/videoRoutes.js";
import r2Routes from "./routes/r2Routes.js";

const app = express();
app.set("trust proxy", 1);

/* ================= REDIS ================= */
export const redisClient = new Redis(process.env.REDIS_URL);
redisClient.on("connect", () => console.log("✅ Redis Connected"));
redisClient.on("error", (err) => console.log("❌ Redis Error:", err));

/* ================= CREATE SERVER ================= */
const server = http.createServer(app);

/* ================= SOCKET.IO ================= */
export const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL,
      process.env.FRONTEND_BACKUP_URL,
      "https://africbook.globelynks.com",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["polling", "websocket"], // Socket.IO handles fallback automatically
});

/* ================= SOCKET.IO AUTH ================= */
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("No token provided"));

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = user.id; // attach userId to socket
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.userId);

  // Join a private room per user
  socket.join(socket.userId);

  // Messaging
  socket.on("send-message", ({ receiverId, text }) => {
    const message = { senderId: socket.userId, receiverId, text, createdAt: new Date() };
    io.to(receiverId).emit("receive-message", message);
    io.to(socket.userId).emit("receive-message", message);
  });

  // Typing indicator
  socket.on("typing", ({ receiverId }) => {
    io.to(receiverId).emit("user-typing", socket.userId);
  });

  // Video features
  socket.on("like-video", ({ videoId }) => io.emit("video-liked", { videoId, userId: socket.userId }));
  socket.on("comment-video", ({ videoId, comment }) => io.emit("new-video-comment", { videoId, comment }));
  socket.on("new-video", (post) => io.emit("new-video", post));

  // Follow system
  socket.on("follow-user", ({ userId }) => io.emit("user-followed", { userId, followerId: socket.userId }));

  socket.on("disconnect", () => console.log("🔴 Socket disconnected:", socket.userId));
});

/* ================= MULTER ================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join("uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.random()}${path.extname(file.originalname)}`;
    cb(null, unique);
  },
});
export const upload = multer({ storage });

/* ================= STATIC FILES ================= */
app.use("/uploads/profiles", express.static("public/uploads/profiles"));
app.use("/uploads/media", express.static("public/uploads/media"));

/* ================= CORS ================= */
const allowedOrigins = [process.env.FRONTEND_URL, process.env.FRONTEND_BACKUP_URL];
app.use(cors({ origin: allowedOrigins, credentials: true }));

/* ================= BODY PARSER ================= */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ================= RATE LIMIT ================= */
const emailLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
app.use("/api/auth/resend-verification", emailLimiter);
app.use("/api/auth/forgot-password", emailLimiter);

/* ================= ROUTES ================= */
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api", searchRoutes);
app.use("/api/imagekit", imagekitRoutes);
app.use("/api/cloudinary", cloudinaryRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/r2", r2Routes);

/* ================= TEST ROUTE ================= */
app.get("/", (req, res) => res.send("Afribook API running 🚀"));

/* ================= MONGODB ================= */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ Mongo Error:", err));

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server running on port ${PORT}`));