// frontend/js/blog.js
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('/api/blogs');
    const blogs = await response.json();
    
    // Lọc chỉ lấy blogs có status = 'published'
    const publishedBlogs = blogs.filter(blog => blog.status === 'published');
    
    const blogContainer = document.querySelector('.noidung');
    if (blogContainer) {
      blogContainer.innerHTML = '';
      
      if (publishedBlogs.length === 0) {
        blogContainer.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">Chưa có blog nào được xuất bản.</p>';
      } else {
        publishedBlogs.forEach(blog => {
          const blogCard = createBlogCard(blog);
          blogContainer.appendChild(blogCard);
        });
      }
      
      // Initialize ScrollReveal for new elements
      if (typeof ScrollReveal !== 'undefined') {
        ScrollReveal().reveal('.slide-up', {
          duration: 1000,
          distance: '50px',
          origin: 'bottom',
          reset: false
        });
      }
    }
  } catch (error) {
    console.error('Error loading blogs:', error);
    const blogContainer = document.querySelector('.noidung');
    if (blogContainer) {
      blogContainer.innerHTML = '<p style="text-align: center; padding: 40px; color: #ff0000;">Không thể tải blogs. Vui lòng thử lại sau.</p>';
    }
  }
});

function createBlogCard(blog) {
  const card = document.createElement('div');
  card.className = 'box slide-up';
  
  // Format date
  const date = new Date(blog.publishedDate || blog.createdAt);
  const formattedDate = date.toLocaleDateString('en-US', { 
    month: '2-digit', 
    day: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  
  card.innerHTML = `
    <a href="blog-detail.html?id=${blog._id}">
      <img src="${blog.image || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800'}" 
           alt="${blog.title}"
           onerror="this.src='https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800'">
    </a>
    <div class="nd">
      <a href="blog-detail.html?id=${blog._id}">${blog.title}</a>
      <h6>${formattedDate}</h6>
      <p>${blog.excerpt || blog.content.substring(0, 150) + '...'}</p>
      <a href="blog-detail.html?id=${blog._id}" class="learn-more">
        <span class="circle" aria-hidden="true">
          <span class="icon arrow"></span>
        </span>
        <span class="button-text">Read Now</span>
      </a>
    </div>
  `;
  
  return card;
}