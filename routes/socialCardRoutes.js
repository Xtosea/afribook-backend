import express from "express";
//import sharp from "sharp";
import Post from "../models/Post.js";

const router = express.Router();

router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("user", "name");

    if (!post) {
      return res.status(404).send("Post not found");
    }

    const username =
      post.user?.name || "AfricSocial User";

    const likes =
      post.likes?.length || 0;

    const comments =
      post.comments?.length || 0;

    const text =
      (post.content || "Shared on AfricSocial")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .slice(0, 120);

    const svg = `
<svg width="1200" height="630"
xmlns="http://www.w3.org/2000/svg">

<rect
width="100%"
height="100%"
fill="#111827"
/>

<rect
x="40"
y="40"
width="1120"
height="550"
rx="24"
fill="#1f2937"
/>

<text
x="80"
y="110"
font-size="48"
font-weight="bold"
fill="#ffffff">
AfricSocial
</text>

<text
x="80"
y="190"
font-size="36"
fill="#60a5fa">
${username}
</text>

<text
x="80"
y="300"
font-size="42"
fill="#ffffff">
${text}
</text>

<text
x="80"
y="520"
font-size="34"
fill="#cbd5e1">
❤️ ${likes}    💬 ${comments}
</text>

</svg>
`;

    const png = await sharp(
  Buffer.from(svg)
)
  .png()
  .toBuffer();

res.setHeader(
  "Content-Type",
  "image/png"
);

res.setHeader(
  "Cache-Control",
  "public, max-age=3600"
);

return res.send(png);

  } catch (err) {
    console.error(
      "SOCIAL CARD ERROR:",
      err
    );

    return res
      .status(500)
      .send("Server error");
  }
});

export default router;