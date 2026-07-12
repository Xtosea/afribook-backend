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

    const contentType =
      req.query.contentType || "application/octet-stream";

    const fileName =
      `videos/${Date.now()}-${Math.random()}.mp4`;


//JUST FOR LOGGING ERRORS 
console.log("Bucket raw:", JSON.stringify(process.env.R2_BUCKET_NAME));
console.log("Length:", process.env.R2_BUCKET_NAME.length);
console.log(
  "Chars:",
  [...process.env.R2_BUCKET_NAME].map(c => c.charCodeAt(0))
);



    const command = new PutObjectCommand({
  Bucket: process.env.R2_BUCKET_NAME,
  Key: fileName,
  ContentType: contentType,
});

const uploadUrl = await getSignedUrl(s3, command, {
  expiresIn: 60 * 5,
});

const fileUrl =
  `${process.env.R2_CUSTOM_DOMAIN}/${fileName}`;

console.log("Upload URL:", uploadUrl);
console.log("File URL:", fileUrl);

res.json({
  uploadUrl,
  fileUrl,
  fileName,
});
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to generate signed URL",
    });
  }
};