const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const socketIo = require('socket.io');
const http = require('http');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Socket.io for real-time features
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || 'demo',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'demo'
});

// MongoDB Connection with Fallback
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zylorb';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err);
  console.log('🔄 Using in-memory storage as fallback...');
});

// Import Models with Error Handling
let User, Post;

try {
  User = require('./models/User');
  Post = require('./models/Post');
  console.log('✅ Models loaded successfully');
} catch (error) {
  console.error('❌ Error loading models:', error);
  console.log('🔄 Creating in-memory models...');
  
  // Fallback in-memory storage
  const users = [];
  const posts = [];
  let userIdCounter = 1;
  let postIdCounter = 1;
  
  // Simple in-memory User class
  class SimpleUser {
    constructor(username, email, password) {
      this.id = userIdCounter++;
      this.username = username;
      this.email = email;
      this.password = password;
      this.avatar = '👤';
      this.zone = 'general';
      this.followers = [];
      this.following = [];
      this.postsCount = 0;
      this.isVerified = false;
      this.createdAt = new Date();
    }
    
    async comparePassword(candidatePassword) {
      return candidatePassword === this.password;
    }
  }
  
  // Simple in-memory Post class
  class SimplePost {
    constructor(userId, username, content, zone) {
      this.id = postIdCounter++;
      this.userId = userId;
      this.username = username;
      this.userAvatar = '👤';
      this.content = content;
      this.zone = zone;
      this.media = [];
      this.tags = [];
      this.likes = [];
      this.comments = [];
      this.likesCount = 0;
      this.commentsCount = 0;
      this.createdAt = new Date();
    }
  }
  
  User = SimpleUser;
  Post = SimplePost;
}

// JWT Authentication Middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // For in-memory storage
    if (typeof User === 'function' && User.name === 'SimpleUser') {
      const user = users.find(u => u.id === decoded.userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      req.user = user;
    } else {
      // For MongoDB
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      req.user = user;
    }
    
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed!'), false);
    }
  }
});

// Routes

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    message: '🚀 ZYLORB API is running!', 
    version: '2.1.0',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'MongoDB' : 'In-Memory'
  });
});

// User Registration
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if using MongoDB or in-memory
    if (mongoose.connection.readyState === 1) {
      // MongoDB version
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        return res.status(400).json({ message: 'User already exists with this email or username' });
      }

      const user = new User({
        username,
        email,
        password,
        avatar: '👤',
        zone: 'general'
      });

      await user.save();

      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '24h' }
      );

      const userResponse = {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        zone: user.zone,
        followers: user.followers.length,
        postsCount: user.postsCount,
        isVerified: user.isVerified
      };

      res.status(201).json({
        message: 'User registered successfully! 🎉',
        token,
        user: userResponse
      });

    } else {
      // In-memory version
      const existingUser = users.find(u => u.email === email || u.username === username);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists with this email or username' });
      }

      const user = new User(username, email, password);
      users.push(user);

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '24h' }
      );

      const userResponse = {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        zone: user.zone,
        followers: user.followers.length,
        postsCount: user.postsCount,
        isVerified: user.isVerified
      };

      res.status(201).json({
        message: 'User registered successfully! 🎉',
        token,
        user: userResponse
      });
    }

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (mongoose.connection.readyState === 1) {
      // MongoDB version
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'Invalid email or password' });
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '24h' }
      );

      const userResponse = {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        zone: user.zone,
        followers: user.followers.length,
        postsCount: user.postsCount,
        isVerified: user.isVerified
      };

      res.json({
        message: 'Login successful! 🎉',
        token,
        user: userResponse
      });

    } else {
      // In-memory version
      const user = users.find(u => u.email === email);
      if (!user) {
        return res.status(400).json({ message: 'Invalid email or password' });
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '24h' }
      );

      const userResponse = {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        zone: user.zone,
        followers: user.followers.length,
        postsCount: user.postsCount,
        isVerified: user.isVerified
      };

      res.json({
        message: 'Login successful! 🎉',
        token,
        user: userResponse
      });
    }

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Create Post
app.post('/api/posts', authenticateToken, upload.array('media', 5), async (req, res) => {
  try {
    const { content, zone, tags } = req.body;
    const userId = req.user.id || req.user._id;

    if (!content || !zone) {
      return res.status(400).json({ message: 'Content and zone are required' });
    }

    if (mongoose.connection.readyState === 1) {
      // MongoDB version
      const mediaUrls = [];
      
      const post = new Post({
        userId,
        username: req.user.username,
        userAvatar: req.user.avatar,
        content,
        zone,
        tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []
      });

      await post.save();
      await User.findByIdAndUpdate(userId, { $inc: { postsCount: 1 } });

      io.emit('newPost', {
        post: {
          ...post.toObject(),
          user: {
            username: req.user.username,
            avatar: req.user.avatar
          }
        }
      });

      res.status(201).json({
        message: `Post created successfully in ${zone} zone! 🎉`,
        post
      });

    } else {
      // In-memory version
      const post = new Post(userId, req.user.username, content, zone);
      if (tags) {
        post.tags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
      
      posts.push(post);
      req.user.postsCount++;

      io.emit('newPost', {
        post: {
          ...post,
          user: {
            username: req.user.username,
            avatar: req.user.avatar
          }
        }
      });

      res.status(201).json({
        message: `Post created successfully in ${zone} zone! 🎉`,
        post
      });
    }

  } catch (error) {
    console.error('Post creation error:', error);
    res.status(500).json({ message: 'Server error while creating post' });
  }
});

// Get Posts by Zone
app.get('/api/posts/:zone', async (req, res) => {
  try {
    const { zone } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (mongoose.connection.readyState === 1) {
      // MongoDB version
      const skip = (page - 1) * limit;
      const posts = await Post.find({ zone })
        .populate('userId', 'username avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const totalPosts = await Post.countDocuments({ zone });

      res.json({
        posts,
        currentPage: page,
        totalPages: Math.ceil(totalPosts / limit),
        totalPosts
      });

    } else {
      // In-memory version
      const zonePosts = posts.filter(post => post.zone === zone)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice((page - 1) * limit, page * limit);

      res.json({
        posts: zonePosts,
        currentPage: page,
        totalPages: Math.ceil(posts.filter(p => p.zone === zone).length / limit),
        totalPosts: posts.filter(p => p.zone === zone).length
      });
    }

  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Server error while fetching posts' });
  }
});

// Serve Frontend (for production)
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Socket.io Real-time Connections
io.on('connection', (socket) => {
  console.log('🔗 User connected:', socket.id);

  socket.on('joinUser', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  socket.on('joinZone', (zone) => {
    socket.join(zone);
    console.log(`User joined ${zone} zone`);
  });

  socket.on('sendMessage', (data) => {
    const { to, message, from } = data;
    socket.to(to).emit('newMessage', {
      from,
      message,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.id);
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 ZYLORB Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
});
