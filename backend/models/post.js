const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  userAvatar: {
    type: String,
    default: '👤'
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  zone: {
    type: String,
    required: true,
    enum: ['gaming', 'life', 'culture', 'professional']
  },
  media: [{
    url: String,
    publicId: String,
    mediaType: {
      type: String,
      enum: ['image', 'video']
    }
  }],
  tags: [String],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    userAvatar: String,
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  likesCount: {
    type: Number,
    default: 0
  },
  commentsCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Update counts before saving
postSchema.pre('save', function(next) {
  this.likesCount = this.likes.length;
  this.commentsCount = this.comments.length;
  next();
});

module.exports = mongoose.model('Post', postSchema);
