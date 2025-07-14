const mongoose = require('mongoose');
const fs = require('fs');
const Post = require('../models/Post');
const Tag = require('../models/Tag');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://hirun08072002:e0GYj3x8vz1BfNQN@cluster0.17zgtnv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function main() {
    await mongoose.connect(MONGODB_URI);

    // Get all tags and build a tag name <-> id map
    const tags = await Tag.find();
    const tagIdToName = {};
    const tagNameToId = {};
    tags.forEach(tag => {
        tagIdToName[tag._id.toString()] = tag.name;
        tagNameToId[tag.name] = tag._id.toString();
    });
    const tagNames = tags.map(t => t.name);

    // Get all posts
    const posts = await Post.find().lean();

    // Build a set of all users who liked any post
    const userSet = new Set();
    posts.forEach(post => {
        (post.likes || []).forEach(uid => userSet.add(uid.toString()));
    });
    const allUsers = Array.from(userSet);

    // Build user-tag interaction counts (how many times a user liked a tag)
    const userTagCounts = {};
    posts.forEach(post => {
        (post.likes || []).forEach(uid => {
            uid = uid.toString();
            if (!userTagCounts[uid]) userTagCounts[uid] = {};
            (post.tags || []).forEach(tagId => {
                const tagName = tagIdToName[tagId.toString()];
                if (!tagName) return;
                userTagCounts[uid][tagName] = (userTagCounts[uid][tagName] || 0) + 1;
            });
        });
    });

    // Build dataset: for each user, for each post, create a row
    const rows = [];
    for (const userId of allUsers) {
        for (const post of posts) {
            // Don't recommend user's own posts
            if (post.author && post.author.toString() === userId) continue;

            // Features: tag presence (multi-hot), user-tag counts
            const postTagSet = new Set((post.tags || []).map(tid => tagIdToName[tid.toString()]));
            const userTagCount = userTagCounts[userId] || {};

            const row = {
                user_id: userId,
                post_id: post._id.toString(),
                label: (post.likes || []).map(uid => uid.toString()).includes(userId) ? 1 : 0
            };
            // For each tag, add post_tag_X and user_tag_X_count
            tagNames.forEach(tag => {
                row[`post_tag_${tag}`] = postTagSet.has(tag) ? 1 : 0;
                row[`user_tag_${tag}_count`] = userTagCount[tag] || 0;
            });
            rows.push(row);
        }
    }

    // Write to CSV
    const header = ['user_id', 'post_id', 'label']
        .concat(tagNames.map(tag => `post_tag_${tag}`))
        .concat(tagNames.map(tag => `user_tag_${tag}_count`));
    const csv = [
        header.join(','),
        ...rows.map(row => header.map(h => row[h] || 0).join(','))
    ].join('\n');
    fs.writeFileSync('user_post_tag_data.csv', csv);
    console.log('Exported user_post_tag_data.csv with', rows.length, 'rows');
    process.exit();
}

main();