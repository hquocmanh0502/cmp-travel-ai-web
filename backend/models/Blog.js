const mongoose = require('mongoose');

// Schema cho Blog Posts (quản lý blog articles)
const blogSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true 
  },
  author: { 
    type: String, 
    required: true,
    trim: true
  },
  excerpt: { 
    type: String, 
    required: true,
    maxlength: 500 
  },
  content: { 
    type: String, 
    required: true 
  },
  image: { 
    type: String 
  },
  category: { 
    type: String,
    required: true,
    enum: [
      'Travel Tips',
      'Destination Guides',
      'Culture & Tradition',
      'Food & Cuisine',
      'Adventure',
      'Budget Travel',
      'Luxury Travel',
      'Family Travel',
      'Solo Travel',
      'Photography',
      'News & Updates'
    ]
  },
  tags: [{ 
    type: String, 
    trim: true,
    lowercase: true 
  }],
  status: { 
    type: String, 
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  publishedDate: { 
    type: Date,
    default: Date.now
  },
  views: { 
    type: Number, 
    default: 0 
  },
  likes: { 
    type: Number, 
    default: 0 
  }
}, {
  timestamps: true // Tự động thêm createdAt và updatedAt
});

// Indexes để tăng tốc query
blogSchema.index({ status: 1, publishedDate: -1 });
blogSchema.index({ category: 1 });
blogSchema.index({ author: 1 });
blogSchema.index({ tags: 1 });

// Export model để backend dùng (query/insert)
module.exports = mongoose.model('Blog', blogSchema);