import express from "express";
import sharp from "sharp";
import Post from "../models/Post.js";

const router = express.Router();

router.get("/:id", async (req, res) => {
  const post = await Post.findById(req.params.id)
    .populate("user", "name");

  if (!post) {
    return res.status(404).send();
  }

  const likes =
    post.likes?.length || 0;

  const comments =
    post.comments?.length || 0;

  const text =
    (post.content || "")
      .slice(0, 120);

  const svg = `
<svg width="1200" height="630"
xmlns="http://www.w3.org/2000/svg">

<rect
width="100%"
height="100%"
fill="#0f172a"/>

<text
x="60"
y="90"
font-size="48"
fill="white"
font-weight="bold">
AfricSocial
</text>

<text
x="60"
y="170"
font-size="38"
fill="#60a5fa">
${post.user.name}
</text>

<text
x="60"
y="280"
font-size="42"
fill="white">
${text}
</text>

<text
x="60"
y="550"
font-size="36"
fill="#94a3b8">
❤️ ${likes}   💬 ${comments}
</text>

</svg>
`;

  const png =
    await sharp(
      Buffer.from(svg)
    )
      .png()
      .toBuffer();

  res.set(
    "Content-Type",
    "image/png"
  );

  res.send(png);
});

export default router;