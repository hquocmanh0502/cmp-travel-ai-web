// frontend/js/blog.js
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('/api/blogs');
    const blogs = await response.json();
    
    const blogContainer = document.querySelector('.blog-container');
    if (blogContainer) {
      blogContainer.innerHTML = '';
      
      blogs.forEach(blog => {
        const blogCard = createBlogCard(blog);
        blogContainer.appendChild(blogCard);
      });
    }
  } catch (error) {
    console.error('Error loading blogs:', error);
  }
});

function createBlogCard(blog) {
  const card = document.createElement('div');
  card.className = 'box slide-up';
  
  card.innerHTML = `
    <a href="blog-detail.html?id=${blog.id}">
      <img src="${blog.thumbnail}" alt="${blog.title}">
    </a>
    <div class="nd">
      <a href="blog-detail.html?id=${blog.id}">${blog.title}</a>
      <h6>${new Date(blog.createdAt).toLocaleDateString()}</h6>
      <p>${blog.description}</p>
      <a href="blog-detail.html?id=${blog.id}" class="learn-more">
        <span class="circle" aria-hidden="true">
          <span class="icon arrow"></span>
        </span>
        <span class="button-text">Read Now</span>
      </a>
    </div>
  `;
  
  return card;
}