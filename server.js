// server.js
import "./config/env.js";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import rateLimit from "express-rate-limit";
import http from "http";
import { Server } from "socket.io";
import fileUpload from "express-fileupload";

/* ================= MODELS ================= */
import Message from "./models/Message.js";
import Post from "./models/Post.js";

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
import messageRoutes from "./routes/messageRoutes.js";
import r2StoryRoutes from "./routes/r2StoryRoutes.js";
import reelRoutes from "./routes/reelRoutes.js";

const app = express();
app.set("trust proxy", 1);

/* ================= CORS ================= */
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_BACKUP_URL,
  "https://africbook.globelynks.com",
];

app.use(cors({ origin: allowedOrigins, credentials: true }));

/* ================= BODY PARSER ================= */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ================= FILEUPLOAD ================= */
app.use(
  fileUpload({
    useTempFiles: false,
    limits: { fileSize: 5 * 1024 * 1024 },
  })
);

/* ================= RATE LIMIT ================= */
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
});

app.use("/api/auth/resend-verification", emailLimiter);
app.use("/api/auth/forgot-password", emailLimiter);

/* ================= STATIC FILES ================= */
app.use("/uploads/profiles", express.static("public/uploads/profiles"));
app.use("/uploads/media", express.static("public/uploads/media"));

/* ================= POST SHARE PREVIEW ================= */

app.get("/post/:id", async (req, res) => {
  try {

    const post = await Post.findById(req.params.id)
      .populate("user", "name profilePic");

    if (!post) {
      return res.send("Post not found");
    }

    const image =
      post.media?.[0]?.url ||
      "https://africbook.globelynks.com/africbook-preview.png";

    const title =
      post.content?.substring(0, 60) ||
      `${post.user?.name} shared a post on Africbook`;

    const description =
      post.content?.substring(0, 150) ||
      "Check this post on Africbook";

    const url =
      `https://africbook.globelynks.com/post/${post._id}`;

    res.send(`
<!DOCTYPE html>
<html>
<head>

<title>${title}</title>

<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${image}" />
<meta property="og:url" content="${url}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Africbook" />

<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">

<meta http-equiv="refresh" content="0; url=/#/post/${post._id}" />

</head>

<body>
Redirecting...
</body>

</html>
`);

  } catch (error) {
    console.error("Share preview error:", error);
    res.status(500).send("Server error");
  }
});


/* ================= ROUTES ================= */
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/imagekit", imagekitRoutes);
app.use("/api/cloudinary", cloudinaryRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/reels", reelRoutes);
app.use("/api/r2", r2StoryRoutes);

/* ================= TEST ROUTE ================= */
app.get("/", (req, res) => {
  res.send("Afribook API running 🚀");
});

/* ================= SOCKET.IO ================= */
const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["polling"],
});

/* ================= SOCKET AUTH ================= */
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    console.log("❌ No token provided");
    return next(new Error("No token provided"));
  }

  next();
});

/* ================= SOCKET EVENTS ================= */
io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`👤 User ${userId} joined`);
  });

  socket.on("send-message", async (data) => {
    try {
      const message = await Message.create(data);

      io.to(data.receiverId).emit("receive-message", message);
      io.to(data.senderId).emit("receive-message", message);
    } catch (error) {
      console.error("Message error:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
  });
});

/* ================= START SERVER ================= */

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {

    console.error("❌ Startup error:", err);

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`⚠️ Server running WITHOUT DB on port ${PORT}`);
    });

  }
};

startServer();