const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Blog = require('../models/Blog');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://hoangquocmanh2004_db_user:NuB0wKG7gc3QiGn0@cluster0.gs9owka.mongodb.net/traveldb?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

async function seedBlogs() {
  try {
    // Read blog data from JSON file
    const blogDataPath = path.join(__dirname, '../../data/blog.json');
    const blogData = JSON.parse(fs.readFileSync(blogDataPath, 'utf-8'));

    // Clear existing blogs
    await Blog.deleteMany({});
    console.log('🗑️  Cleared existing blogs');

    // Transform and insert blogs
    const blogs = blogData.map(blog => ({
      title: blog.title,
      author: 'CMP Travel Team',
      excerpt: blog.description,
      content: generateContentFromBlogData(blog),
      image: blog.thumbnail,
      thumbnail: blog.thumbnail,
      images: blog.images || [],
      readingTime: Math.ceil(blog.description.length / 200), // Estimate reading time
      category: determineCategoryFromTitle(blog.title),
      tags: extractTagsFromContent(blog.title + ' ' + blog.description),
      status: 'published',
      publishedDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
      views: Math.floor(Math.random() * 2000) + 500,
      likes: Math.floor(Math.random() * 500) + 100
    }));

    const insertedBlogs = await Blog.insertMany(blogs);
    console.log(`✅ Successfully seeded ${insertedBlogs.length} blogs`);

    // Display inserted blogs
    insertedBlogs.forEach((blog, index) => {
      console.log(`\n📝 Blog ${index + 1}:`);
      console.log(`   ID: ${blog._id}`);
      console.log(`   Title: ${blog.title}`);
      console.log(`   Category: ${blog.category}`);
      console.log(`   Views: ${blog.views}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding blogs:', error);
    process.exit(1);
  }
}

// Helper function to generate HTML content from blog data
function generateContentFromBlogData(blog) {
  let content = `<div class="blog-content">`;
  
  content += `<p class="lead">${blog.description}</p>`;
  
  if (blog.geography) {
    content += `
      <h2>Geography</h2>
      <p>${blog.geography}</p>
    `;
  }
  
  if (blog.climate) {
    content += `
      <h2>Climate</h2>
      <p>${blog.climate}</p>
    `;
  }
  
  if (blog.language) {
    content += `
      <h2>Language & Communication</h2>
      <p>${blog.language}</p>
    `;
  }
  
  if (blog.people) {
    content += `
      <h2>People & Culture</h2>
      <p>${blog.people}</p>
    `;
  }
  
  // Add images if available
  if (blog.images && blog.images.length > 0) {
    content += `
      <h2>Gallery</h2>
      <div class="image-gallery">
    `;
    blog.images.forEach((img, index) => {
      content += `
        <figure>
          <img src="${img}" alt="${blog.title} - Image ${index + 1}" style="width: 100%; border-radius: 12px; margin: 20px 0;">
        </figure>
      `;
    });
    content += `</div>`;
  }
  
  content += `</div>`;
  return content;
}

// Helper function to determine category from title
function determineCategoryFromTitle(title) {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('paradise') || lowerTitle.includes('beach')) {
    return 'Luxury Travel';
  } else if (lowerTitle.includes('village') || lowerTitle.includes('alps')) {
    return 'Adventure';
  } else if (lowerTitle.includes('cultural') || lowerTitle.includes('culture')) {
    return 'Culture & Tradition';
  } else if (lowerTitle.includes('city') || lowerTitle.includes('metropolis')) {
    return 'Destination Guides';
  } else {
    return 'Travel Tips';
  }
}

// Helper function to extract tags from content
function extractTagsFromContent(text) {
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'is', 'are'];
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.includes(word));
  
  // Get unique words and take first 5
  const tags = [...new Set(words)].slice(0, 5);
  return tags;
}

// Run the seed function
seedBlogs();
