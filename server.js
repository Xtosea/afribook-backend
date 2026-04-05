// server.js
import "./config/env.js";
import express from "express";
import path from "path";
import mongoose from "mongoose";
import cors from "cors";
import rateLimit from "express-rate-limit";
import http from "http";
import { Server } from "socket.io";
import fileUpload from "express-fileupload";
import helmet from "helmet";

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

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(new Error("CORS policy does not allow access from this origin"), false);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

/* ================= HELMET + CSP ================= */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", "data:", "blob:", "https:"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://africbook.globelynks.com",
          "https://static.cloudflareinsights.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: [
          "'self'",
          "ws:",
          "wss:",
          "https://africbook.globelynks.com",
          process.env.FRONTEND_URL,
          process.env.FRONTEND_BACKUP_URL,
          process.env.BACKEND_URL || "https://afribook-backend.onrender.com",
        ],
        fontSrc: ["'self'", "https:", "data:"],
        mediaSrc: ["'self'", "blob:", "https:"],
        frameSrc: ["'self'", "https:"],
      },
    },
  })
);

// Allow images to be used cross-origin
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

/* ================= BODY PARSER ================= */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ================= FILEUPLOAD ================= */
app.use(
  fileUpload({
    useTempFiles: false,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
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
// Profile images
app.use("/uploads/profiles", express.static(path.join(process.cwd(), "public/uploads/profiles")));
// Media uploads
app.use("/uploads/media", express.static(path.join(process.cwd(), "public/uploads/media")));
// Default profile/cover images
app.use("/profile", express.static(path.join(process.cwd(), "public/profile")));

/* ================= POST SHARE PREVIEW ================= */
app.get("/post/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate("user", "name profilePic");
    if (!post) return res.send("Post not found");

    let image = "https://africbook.globelynks.com/africbook-preview.png";

    if (post.media && post.media.length > 0) {
      const firstMedia = post.media[0];
      if (firstMedia.type === "image") {
        image = firstMedia.url.startsWith("http") ? firstMedia.url : `https://africbook.globelynks.com${firstMedia.url}`;
      } else if (firstMedia.type === "video") {
        image = firstMedia.thumbnailUrl
          ? firstMedia.thumbnailUrl.startsWith("http")
            ? firstMedia.thumbnailUrl
            : `https://africbook.globelynks.com${firstMedia.thumbnailUrl}`
          : firstMedia.url.startsWith("http")
          ? firstMedia.url
          : `https://africbook.globelynks.com${firstMedia.url}`;
      }
    }

    const title = post.content?.substring(0, 60) || `${post.user?.name} shared a post on Africbook`;
    const description = post.content?.substring(0, 150) || "Check this post on Africbook";
    const url = `https://africbook.globelynks.com/post/${post._id}`;

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image" content="${image}" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content="${url}" />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="Africbook" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${title}" />
        <meta name="twitter:description" content="${description}" />
        <meta name="twitter:image" content="${image}" />
        <meta http-equiv="refresh" content="0; url=/#/post/${post._id}" />
      </head>
      <body>
        Redirecting to Africbook...
      </body>
      </html>
    `);
  } catch (err) {
    console.error("Share preview error:", err);
    res.status(500).send("Server error");
  }
});

/* ================= API ROUTES ================= */
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

/* ================= CREATE HTTP SERVER ================= */
const server = http.createServer(app);

/* ================= SOCKET.IO ================= */
export const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  path: "/socket.io",
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
let onlineUsers = [];

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(userId);
    socket.userId = userId;

    if (!onlineUsers.includes(userId)) {
      onlineUsers.push(userId);
    }

    io.emit("online-users", onlineUsers);

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

    onlineUsers = onlineUsers.filter(
      (id) => id !== socket.userId
    );

    io.emit("online-users", onlineUsers);
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