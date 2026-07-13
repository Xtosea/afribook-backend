import express from "express";
import mongoose from "mongoose";
import Post from "../models/Post.js";

const router = express.Router();

const escapeHtml = (str = "") =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");


/* ================= POST SHARE PREVIEW ================= */

router.get("/post/:id", async (req, res) => {

  try {
    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.id
      )
    ) {
      return res
        .status(400)
        .send("Invalid post ID");
    }

    const FRONTEND_URL =
      "https://africsocial.globelynks.com";

    const BACKEND_URL =
      "https://afribook-backend.onrender.com";

    const post =
      await Post.findById(req.params.id)
        .populate(
          "user",
          "name profilePic"
        );

    if (!post) {
      return res
        .status(404)
        .send("Post not found");
    }

    const imageMedia = post.media?.find(
  (m) => m.type === "image"
);

const videoMedia = post.media?.find(
  (m) => m.type === "video"
);

let image = `${FRONTEND_URL}/social-preview.png`;
let videoUrl = null;

if (imageMedia) {
  image =
    imageMedia.url ||
    imageMedia.secure_url ||
    imageMedia.src;
} else if (videoMedia) {
  videoUrl =
    videoMedia.url ||
    videoMedia.secure_url ||
    videoMedia.src;

  image =
    videoMedia.thumbnailUrl ||
    videoMedia.thumbnail ||
    videoMedia.poster ||
    `${BACKEND_URL}/post-card/${post._id}`;
} else {
  image =
    `${BACKEND_URL}/post-card/${post._id}`;
}


const title =
  post.content
    ? `${post.user?.name}: ${post.content.slice(0, 80)}`
    : `${post.user?.name} shared a post`;

const description = `
${post.likes?.length || 0} likes •
${post.comments?.length || 0} comments •
View on AfricSocial
`;

const redirectUrl =
  `${FRONTEND_URL}/post/${post._id}`;


    const safeTitle =
      escapeHtml(title);

    const safeDescription =
      escapeHtml(description);

    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>

<meta charset="UTF-8" />

<meta
name="viewport"
content="width=device-width, initial-scale=1"
/>

<title>${safeTitle}</title>

<meta
name="description"
content="${safeDescription}"
/>

<link
rel="icon"
href="${FRONTEND_URL}/favicon.ico"
/>

<!-- Open Graph -->

<meta
property="og:title"
content="${safeTitle}"
/>

<meta
property="og:description"
content="${safeDescription}"
/>

<meta
property="og:image"
content="${image}"
/>

<meta
property="og:url"
content="${redirectUrl}"
/>

<meta
property="og:type"
content="article"
/>

<meta
property="og:site_name"
content="AfricSocial"
/>

<!-- Twitter -->

<meta
name="twitter:card"
content="summary_large_image"
/>

<meta
name="twitter:title"
content="${safeTitle}"
/>

<meta
name="twitter:description"
content="${safeDescription}"
/>

<meta
name="twitter:image"
content="${image}"
/>


${
  videoUrl
    ? `
<meta
property="og:video"
content="${videoUrl}"
/>

<meta
property="og:video:type"
content="video/mp4"
/>

<meta
property="og:video:width"
content="720"
/>

<meta
property="og:video:height"
content="1280"
/>
`
    : ""
}

<!-- Structured Data -->

<script type="application/ld+json">
{
 "@context":"https://schema.org",
 "@type":"SocialMediaPosting",
 "headline":"${safeTitle}",
 "description":"${safeDescription}",
 "image":"${image}"
}
</script>

<script>
setTimeout(() => {
  window.location.href = "${redirectUrl}";
}, 3000);
</script>

</head>

<body>

<div
style="
font-family:sans-serif;
padding:30px;
text-align:center;
"
>

<h2>${safeTitle}</h2>

<img
src="${image}"
style="
max-width:100%;
border-radius:12px;
"
/>

<p>
Redirecting to AfricSocial...
</p>

<a href="${redirectUrl}">
Open Post
</a>

</div>

</body>
</html>
`);
  } catch (err) {
    console.error(
      "POST SHARE ERROR:",
      err
    );

    res
      .status(500)
      .send("Server error");
  }
});

export default router;