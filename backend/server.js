const http = require('http');
const database = require('./database');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
// 🟢 MONGODB CONNECTION SETUP
const mongoose = require("mongoose");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection failed:", err));
// Password Hashing Functions
const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

const verifyPassword = (password, hashed) => {
    return hashPassword(password) === hashed;
};

// 🔐 ENHANCED SECURITY
const JWT_SECRET = 'zylorb-secure-key-' + Date.now();

// Input Sanitization Function
const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

// Enhanced JWT Token Functions
const generateToken = (user) => {
    const payload = {
        userId: user.id,
        email: user.email,
        username: user.username,
        timestamp: Date.now()
    };
    const signature = crypto.createHmac('sha256', JWT_SECRET)
                           .update(JSON.stringify(payload))
                           .digest('hex');
    return Buffer.from(JSON.stringify({payload, signature})).toString('base64');
};

const verifyToken = (token) => {
    try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
        const expectedSignature = crypto.createHmac('sha256', JWT_SECRET)
                                      .update(JSON.stringify(decoded.payload))
                                      .digest('hex');
        
        if (decoded.signature !== expectedSignature) {
            return null;
        }
        
        if (Date.now() - decoded.payload.timestamp > 24 * 60 * 60 * 1000) {
            return null;
        }
        
        return decoded.payload;
    } catch (error) {
        return null;
    }
};

// Authentication Middleware
const authenticateToken = (req) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return null;
    
    const token = authHeader.split(' ')[1];
    if (!token) return null;
    
    return verifyToken(token);
};
// Rate limiting storage
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 100; // Maximum requests per window

// Helper functions
const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validatePassword = (password) => {
    return password && password.length >= 6;
};

const validateUsername = (username) => {
    return username && username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username);
};

// Rate limiting middleware
const checkRateLimit = (ip) => {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;
    
    if (!rateLimit.has(ip)) {
        rateLimit.set(ip, { count: 1, startTime: now });
        return true;
    }
    
    const userData = rateLimit.get(ip);
    
    // Reset if window has passed
    if (userData.startTime < windowStart) {
        userData.count = 1;
        userData.startTime = now;
        return true;
    }
    
    // Check if over limit
    if (userData.count >= MAX_REQUESTS) {
        return false;
    }
    
    userData.count++;
    return true;
};
const PORT = 5000;
let users = [];
let posts = [];
let nextUserId = 1;
let nextPostId = 1;

const server = http.createServer((req, res) => {
    // 🔥 NAYA CORS CODE - RATE LIMITING SE PEHLE
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin, Accept');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // PREFLIGHT REQUESTS HANDLE KARO
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // AB RATE LIMITING CHECK KARO
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    // Apply rate limiting
    if (!checkRateLimit(clientIP)) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Too many requests. Please try again later.' }));
        return;
    }
    
    if (req.url === '/api' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            message: '🚀 ZYLORB Backend API is running!',
            version: '2.1.0',
            status: 'success'
        }));
        return;
    }
    
       // 🔐 YEH NAYA REGISTRATION CODE 
    if (req.url === '/api/register' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const username = sanitizeInput(data.username);
                const email = sanitizeInput(data.email);
                const password = data.password;
                
                if (!username || !email || !password) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'All fields required' }));
                    return;
                }
                
                // Data size validation
                if (body.length > 1000000) {
                    res.writeHead(413, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Too much data' }));
                    return;
                }
                
                // Email validation
                if (!validateEmail(email)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Invalid email format' }));
                    return;
                }
                
                // Username validation
                if (!validateUsername(username)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        message: 'Username must be at least 3 characters and contain only letters, numbers, and underscores' 
                    }));
                    return;
                }
                
                // Password validation
                if (!validatePassword(password)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        message: 'Password must be at least 6 characters long' 
                    }));
                    return;
                }
                
                const existing = users.find(u => u.email === email || u.username === username);
                if (existing) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'User already exists' }));
                    return;
                }
                
                // 🔐 HASH PASSWORD BEFORE SAVING
                const hashedPassword = hashPassword(password);
                
                const user = {
                    id: nextUserId++,
                    username,
                    email,
                    password: hashedPassword,
                    avatar: '👤',
                    zone: 'general',
                    followers: 0,
                    posts: 0,
                    verified: false,
                    createdAt: new Date()
                };
                users.push(user);
                
                // 🔐 GENERATE JWT TOKEN
                const token = generateToken(user);
                
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    message: 'User created successfully',
                    token: token,
                    user: { 
                        id: user.id, 
                        username, 
                        email, 
                        avatar: '👤',
                        zone: 'general'
                    }
                }));
                
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Server error' }));
            }
        });
        return;
    }
    
       // 🔐 YEH NAYA LOGIN CODE 
    if (req.url === '/api/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
               const email = sanitizeInput(data.email);
                const password = data.password;
                
                if (!email || !password) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Email and password required' }));
                    return;
                }
                
                // Data size validation
                if (body.length > 1000000) {
                    res.writeHead(413, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Too much data' }));
                    return;
                }
                
                // Email validation
                if (!validateEmail(email)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Invalid email format' }));
                    return;
                }
                
                // 🔐 FIND USER AND VERIFY HASHED PASSWORD
                const user = users.find(u => u.email === email);
                if (!user || !verifyPassword(password, user.password)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Invalid credentials' }));
                    return;
                }
                
                // 🔐 GENERATE JWT TOKEN
                const token = generateToken(user);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    message: 'Login successful',
                    token: token,
                    user: { 
                        id: user.id, 
                        username: user.username, 
                        email: user.email, 
                        avatar: user.avatar,
                        zone: user.zone,
                        followers: user.followers,
                        posts: user.posts,
                        verified: user.verified
                    }
                }));
                
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Server error' }));
            }
        });
        return;
    }
    // 🔥 POST CREATION ENDPOINT - YEH ADD KARO (YAHAN)
    if (req.url === '/api/posts' && req.method === 'POST') {
        const user = authenticateToken(req);
        if (!user) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Unauthorized' }));
            return;
        }

        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { content, zone, tags = [] } = data;
                
                if (!content || !zone) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Content and zone required' }));
                    return;
                }

                // Content moderation check
                const moderationResult = {
                    approved: true,
                    message: 'Content approved'
                };

                if (!moderationResult.approved) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: moderationResult.message }));
                    return;
                }

                const post = {
                    id: nextPostId++,
                    userId: user.userId,
                    username: user.username,
                    content,
                    zone,
                    tags,
                    likes: 0,
                    comments: [],
                    createdAt: new Date(),
                    userAvatar: '👤'
                };
                posts.push(post);

                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    message: `Post created in ${zone} zone! 🎉`,
                    post: post
                }));
                
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Server error' }));
            }
        });
        return;
    }
    // Cloudinary File Upload Endpoint
if (req.url === '/api/upload' && req.method === 'POST') {
  const user = authenticateToken(req);
  if (!user) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Unauthorized' }));
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk.toString());
  req.on('end', async () => {
    try {
      const { image, folder = 'zylorb' } = JSON.parse(body);
      
      // Cloudinary upload simulation (replace with actual Cloudinary)
      const fakePublicId = 'zylorb_' + Date.now();
      const fakeUrl = `https://res.cloudinary.com/demo/image/upload/${fakePublicId}.jpg`;
      
      // Actual Cloudinary code (uncomment when credentials ready):
      // const result = await cloudinary.uploader.upload(image, {
      //   folder: folder,
      //   resource_type: 'auto'
      // });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'File uploaded successfully',
        url: fakeUrl, // result.secure_url
        public_id: fakePublicId // result.public_id
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Upload failed: ' + error.message }));
    }
  });
  return;
}

// File Delete Endpoint
if (req.url === '/api/delete-file' && req.method === 'POST') {
  const user = authenticateToken(req);
  if (!user) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Unauthorized' }));
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk.toString());
  req.on('end', async () => {
    try {
      const { public_id } = JSON.parse(body);
      
      // Cloudinary delete simulation
      // await cloudinary.uploader.destroy(public_id);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'File deleted successfully',
        result: { result: 'ok' }
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Delete failed: ' + error.message }));
    }
  });
  return;
}

// 🔥🔥🔥 YAHAN STATIC FILE SERVING CODE ADD KARO

// 🔥 STATIC FILE SERVING - DEBUG VERSION
if (req.url === '/' || req.url === '/index.html') {
    // Different path options try karo
    const pathOptions = [
        path.join(__dirname, 'frontend/index.html'),
        path.join(__dirname, '../frontend/index.html'), 
        path.join(process.cwd(), 'frontend/index.html')
    ];
    
    let filePath;
    for (const option of pathOptions) {
        if (fs.existsSync(option)) {
            filePath = option;
            console.log('✅ Found index.html at:', filePath);
            break;
        }
    }
    
    if (!filePath) {
        console.log('❌ All path options failed:', pathOptions);
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>ZYLORB Frontend not found - Check console logs</h1>');
        return;
    }
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.log('❌ Error loading index.html:', err.message);
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>Error loading frontend</h1>');
            return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
    });
    return;
}

// Static files (CSS, JS, etc.)
if (req.url.endsWith('.css') || req.url.endsWith('.js') || req.url.endsWith('.png') || req.url.endsWith('.jpg') || req.url.endsWith('.json')) {
    const filePath = path.join(__dirname, '../frontend', req.url);
    console.log('Looking for static file:', filePath);
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.log('Error loading static file:', err.message);
            res.writeHead(404);
            res.end('File not found');
            return;
        }
        const contentType = req.url.endsWith('.css') ? 'text/css' : 
                          req.url.endsWith('.js') ? 'application/javascript' :
                          req.url.endsWith('.json') ? 'application/json' :
                          'image/' + req.url.split('.').pop();
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
    return;
}

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Route not found' }));
});

server.listen(PORT, () => {
    console.log('🚀 ZYLORB Server running on http://localhost:' + PORT);
    console.log('✅ Backend ready! Test: http://localhost:' + PORT + '/api');
});
