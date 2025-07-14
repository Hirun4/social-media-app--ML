const axios = require('axios');
const Tag = require('../models/Tag');

async function getPersonalizedScores(user, posts) {
    // Get all tags from DB
    const tags = await Tag.find();
    const allTagNames = tags.map(t => t.name);

    // Build user tag counts (from likes)
    const userTagCounts = {};
    for (const post of posts) {
        if (post.likes && post.likes.map(id => id.toString()).includes(user._id.toString())) {
            for (const tagId of post.tags) {
                const tag = tags.find(t => t._id.toString() === tagId.toString());
                if (tag) userTagCounts[tag.name] = (userTagCounts[tag.name] || 0) + 1;
            }
        }
    }

    // Build feature dicts for each post
    const featureDicts = posts.map(post => {
        const postTagNames = post.tags.map(tagId => {
            const tag = tags.find(t => t._id.toString() === tagId.toString());
            return tag ? tag.name : null;
        }).filter(Boolean);

        const feature = {};
        allTagNames.forEach(tag => {
            feature[`post_tag_${tag}`] = postTagNames.includes(tag) ? 1 : 0;
            feature[`user_tag_${tag}_count`] = userTagCounts[tag] || 0;
        });
        return feature;
    });

    // Call Python scoring API
    const response = await axios.post('http://localhost:5005/score', {
        data: featureDicts
    });
    return response.data; // Array of scores
}

module.exports = { getPersonalizedScores };