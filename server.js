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
import r2Routes from "./routes/r2Routes.js";
import storyFeedRoutes from "./routes/storyFeedRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import friendRoutes from "./routes/friendRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

const app = express();
app.set("trust proxy", 1);

/* ================= CORS ================= */
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_BACKUP_URL,
  "https://africsocial.globelynks.com",
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
          "https://africsocial.globelynks.com",
          "https://static.cloudflareinsights.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: [
          "'self'",
          "ws:",
          "wss:",
          "https://africsocial.globelynks.com",
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

    // VALIDATE ID
    if (
      !mongoose.Types.ObjectId.isValid(req.params.id)
    ) {
      return res.status(400).send("Invalid post ID");
    }

    const FRONTEND_URL =
      "https://africsocial.globelynks.com";

    const BACKEND_URL =
      "https://afribook-backend.onrender.com";

    // FIND POST
    const post = await Post.findById(req.params.id)
      .populate("user", "name profilePic");

    if (!post) {
      return res.status(404).send("Post not found");
    }

    console.log(
      "POST MEDIA:",
      JSON.stringify(post.media, null, 2)
    );

    const firstMedia = post?.media?.[0];

    // DEFAULT PREVIEW IMAGE
    let image =
      `${FRONTEND_URL}/social-preview.png`;

    // HANDLE IMAGE POSTS
    if (
      firstMedia &&
      firstMedia.type === "image"
    ) {

      const mediaUrl =
        firstMedia.url ||
        firstMedia.secure_url ||
        firstMedia.src;

      if (mediaUrl) {

        image = mediaUrl.startsWith("http")
          ? mediaUrl
          : `${BACKEND_URL}${mediaUrl}`;
      }
    }

    // HANDLE VIDEO POSTS
    if (
      firstMedia &&
      firstMedia.type === "video"
    ) {

      const thumb =
        firstMedia.thumbnailUrl ||
        firstMedia.thumbnail ||
        firstMedia.poster;

      if (thumb) {

        image = thumb.startsWith("http")
          ? thumb
          : `${BACKEND_URL}${thumb}`;
      }
    }

    // TITLE
    const title =
      post.content?.substring(0, 60) ||
      `${post.user?.name} shared a post`;

    // DESCRIPTION
    const description =
      post.content?.substring(0, 150) ||
      "Check this post on AfricSocial";

    // FRONTEND REDIRECT
    const redirectUrl =
      `${FRONTEND_URL}/post/${post._id}`;

    // SEND HTML WITH OG TAGS
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>

<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<title>${title}</title>

<meta name="description" content="${description}" />

<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${image}" />
<meta property="og:url" content="${redirectUrl}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="AfricSocial" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${image}" />

<script>
setTimeout(() => {
  window.location.href = "${redirectUrl}";
}, 1000);
</script>

</head>

<body>

Redirecting...

</body>
</html>
`);

  } catch (err) {

    console.error(
      "POST SHARE ERROR:",
      err
    );

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
app.use("/api/r2", r2Routes);
app.use("/api/r2stories", r2StoryRoutes);
app.use("/api/stories", storyFeedRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/ai", aiRoutes);


/* ================= TEST ROUTE ================= */
app.get("/", (req, res) => {
  res.send("AfricSocial API running 🚀");
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

  console.log(
    "🟢 Socket connected:",
    socket.id
  );

  // JOIN USER ROOM
  socket.on("join", (userId) => {

    socket.join(userId);

    socket.userId = userId;

    if (
      !onlineUsers.includes(userId)
    ) {
      onlineUsers.push(userId);
    }

    io.emit(
      "online-users",
      onlineUsers
    );

    console.log(
      `👤 User ${userId} joined`
    );
  });

  // SEND MESSAGE
  socket.on(
    "send-message",
    async (data) => {

      try {

        const message =
          await Message.create(data);

        io.to(
          data.receiver
        ).emit(
          "receive-message",
          message
        );

        io.to(
          data.sender
        ).emit(
          "receive-message",
          message
        );

      } catch (error) {

        console.error(
          "Message error:",
          error
        );
      }
    }
  );

  // ================= CALL EVENTS =================

  // CALL USER
  socket.on(
    "call-user",
    (data) => {

      io.to(data.to).emit(
        "incoming-call",
        {
          from:
            data.from,
          signal:
            data.signal,
          callType:
            data.callType,
        }
      );
    }
  );

  // ANSWER CALL
  socket.on(
    "answer-call",
    (data) => {

      io.to(data.to).emit(
        "call-accepted",
        data.signal
      );
    }
  );

  // END CALL
  socket.on(
    "end-call",
    (data) => {

      io.to(data.to).emit(
        "call-ended"
      );
    }
  );

  // DISCONNECT
  socket.on(
    "disconnect",
    () => {

      console.log(
        "🔴 Socket disconnected:",
        socket.id
      );

      onlineUsers =
        onlineUsers.filter(
          (id) =>
            id !== socket.userId
        );

      io.emit(
        "online-users",
        onlineUsers
      );
    }
  );
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