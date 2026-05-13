import Post from "../models/Post.js";

export const createPost = async (req, res) => {
try {

const post = await Post.create({
user: req.user.id,
text: req.body.text,
image: req.body.image
});

res.json(post);

} catch (error) {
res.status(500).json({ error: error.message });
}
};

export const getPosts = async (req, res) => {
try {

const posts = await Post.find()
.populate("user", "name profilePic")
.sort({ createdAt: -1 });

res.json(posts);

} catch (error) {
res.status(500).json({ error: error.message });
}
};

export const likePost = async (req, res) => {
  try {

    const post = await Post.findById(req.params.id);

    const alreadyLiked = post.likes.includes(req.user.id);

    if (alreadyLiked) {

      post.likes = post.likes.filter(
        (id) => id.toString() !== req.user.id
      );

    } else {

      post.likes.push(req.user.id);

    }

    await post.save();

    res.json(post);

  } catch (error) {

    res.status(500).json({
      error: error.message,
    });

  }
};