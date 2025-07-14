const Post = require('../models/Post');
const User = require('../models/User');
const Tag = require('../models/Tag'); 
const { getPersonalizedScores } = require('../utils/recommendation');

const createPost = async (req, res) => {
  try {
    const { content, tags } = req.body;
    let image = '';
    if (req.file) {
      image = '/uploads/' + req.file.filename;
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Post content is required' });
    }

   
    const post = new Post({
      content: content.trim(),
      author: req.user.id,
      image,
      tags: Array.isArray(tags) ? tags : []
    });

    await post.save();
    await User.findByIdAndUpdate(req.user.id, { $inc: { postsCount: 1 } });
    await post.populate('author', 'username fullName avatar');
    await post.populate('tags', 'name'); 

    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getFeedPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(req.user.id);
    const followingIds = currentUser.following; 

    const posts = await Post.find({ author: { $ne: req.user.id } })
      .populate('author', 'username fullName avatar')
      .populate('tags', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username fullName avatar')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username fullName avatar'
        }
      });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const hasLiked = post.likes.includes(req.user.id);

    if (hasLiked) {
     
      post.likes = post.likes.filter(id => !id.equals(req.user.id));
      post.likesCount = Math.max(0, post.likesCount - 1);
    } else {
      
      post.likes.push(req.user.id);
      post.likesCount += 1;
    }

    await post.save();

    res.json({
      liked: !hasLiked,
      likesCount: post.likesCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (!post.author.equals(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    await Post.findByIdAndDelete(req.params.id);

   
    await User.findByIdAndUpdate(req.user.id, { $inc: { postsCount: -1 } });

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getAllPosts = async (req, res) => {
  console.log('getAllPosts called');
  try {
    const posts = await Post.find()
      .populate('author', 'username fullName avatar')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const editPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (!post.author.equals(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to edit this post' });
    }

    const { content } = req.body;
    if (content) post.content = content;

   
    if (req.file) {
      post.image = '/uploads/' + req.file.filename;
    }

    await post.save();
    await post.populate('author', 'username fullName avatar');
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getPersonalizedFeed = async (req, res) => {
    try {
        const user = req.user;
        // Get candidate posts (e.g., all except own)
        const posts = await Post.find({ author: { $ne: user._id } })
            .populate('author', 'username fullName avatar')
            .populate('tags', 'name')
            .lean();

        // Get scores
        const scores = await getPersonalizedScores(user, posts);

        // Attach scores and sort
        posts.forEach((post, i) => post.score = scores[i]);
        posts.sort((a, b) => b.score - a.score);

        res.json(posts.slice(0, 50)); // Return top 50
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
  createPost,
  getFeedPosts,
  getPost,
  likePost,
  deletePost,
  getAllPosts,
  editPost,
  getPersonalizedFeed
};