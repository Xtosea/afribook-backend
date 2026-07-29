import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

console.log("R2 ENDPOINT:", process.env.R2_ENDPOINT);

const s3 = new S3Client({
 region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export const getSignedUploadUrl = async (req, res) => {
  try {
    console.log("=== STEP 1 ===");
    console.log("Signed URL requested");
    console.log("Content-Type:", req.query.contentType);

    const contentType =
      req.query.contentType || "application/octet-stream";

    const fileName =
      `videos/${Date.now()}-${Math.random()}.mp4`;

    const bucket = process.env.R2_BUCKET_NAME.trim();

    console.log("Bucket:", bucket);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileName,
      ContentType: contentType,
    });

    console.log("Creating signed URL...");

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: 300,
    });

    console.log("✅ Signed URL created");

    const fileUrl =
      `${process.env.R2_CUSTOM_DOMAIN}/${fileName}`;

    res.json({
      uploadUrl,
      fileUrl,
      fileName,
    });

  } catch (err) {
    console.error("SIGNED URL ERROR:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};