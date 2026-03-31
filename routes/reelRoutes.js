import ffmpeg from "fluent-ffmpeg";

// Inside your /upload route after saving video to R2
const thumbnailFileName = `reels/thumbnails/${Date.now()}-thumb.jpg`;
const thumbnailPath = `/tmp/${Date.now()}-thumb.jpg`;

// Generate thumbnail using ffmpeg
await new Promise((resolve, reject) => {
  ffmpeg(file.path)
    .screenshots({
      timestamps: ["50%"],
      filename: thumbnailPath.split("/").pop(),
      folder: "/tmp",
      size: "640x360",
    })
    .on("end", resolve)
    .on("error", reject);
});

// Upload thumbnail to R2
const thumbnailBuffer = fs.readFileSync(thumbnailPath);
await s3.send(
  new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: thumbnailFileName,
    Body: thumbnailBuffer,
    ContentType: "image/jpeg",
  })
);
fs.unlinkSync(thumbnailPath);

// Save video post with thumbnail
const reel = await Post.create({
  user: req.user._id,
  content: caption || "",
  media: [
    {
      url: `${R2_CUSTOM_DOMAIN}/${fileName}`,
      type: "video",
      thumbnailUrl: `${R2_CUSTOM_DOMAIN}/${thumbnailFileName}`,
    },
  ],
  isReel: true,
});