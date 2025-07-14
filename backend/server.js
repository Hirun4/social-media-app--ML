const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const tagRoutes = require('./routes/tags');

const app = express();


app.use(cors({
  origin: ['http://localhost:5501', 'http://127.0.0.1:5501'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../frontend')));


mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/socialmedia', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));


app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/tags', tagRoutes);


app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 5002; 
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});