window.addEventListener("DOMContentLoaded", async () => {
  // Reading Progress Bar
  createReadingProgressBar();
  
  // Get id from url
  const urlParams = new URLSearchParams(window.location.search);
  const blogId = urlParams.get("id");

  if (!blogId) {
    alert("Blog ID not found!");
    window.location.href = "./blog.html";
    return;
  }

  let objectBlog;

  try {
    // Fetch blog từ API
    const response = await fetch(`/api/blogs/${blogId}`);
    if (response.ok) {
      objectBlog = await response.json();
      console.log("Blog data from API:", objectBlog);
    } else {
      throw new Error(`API returned ${response.status}`);
    }
  } catch (err) {
    console.error("Error loading blog:", err);
    alert("Unable to load blog information!");
    window.location.href = "./blog.html";
    return;
  }

  // Kiểm tra xem blog có tồn tại không
  if (!objectBlog) {
    alert("Blog does not exist!");
    window.location.href = "./blog.html";
    return;
  }

  // Render blog
  renderBlog(objectBlog);
  
  // Initialize features
  initScrollToTop();
  initSocialShare(objectBlog);
  
  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
});

function createReadingProgressBar() {
  const progressBar = document.createElement('div');
  progressBar.className = 'reading-progress';
  document.body.prepend(progressBar);
  
  window.addEventListener('scroll', () => {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    progressBar.style.width = scrolled + '%';
  });
}

function renderBlog(objectBlog) {
  // Get DOM elements
  const downTitle = document.querySelector("#down-title");
  const blogTitle = document.querySelector(".blog-title");
  const authorName = document.querySelector("#author-name");
  const publishDate = document.querySelector("#publish-date");
  const categoryName = document.querySelector("#category-name");
  const viewCount = document.querySelector("#view-count");
  const blogImage = document.querySelector("#blog-main-image");
  const blogExcerpt = document.querySelector("#blog-excerpt");
  const blogContent = document.querySelector("#blog-content-text");
  const tagsContainer = document.querySelector("#blog-tags-container");

  // Set page title
  document.title = `${objectBlog.title} - CMP Travel Blog`;
  
  // Display blog title
  if (downTitle) downTitle.textContent = objectBlog.title;
  blogTitle.textContent = objectBlog.title;

  // Display meta information
  authorName.textContent = objectBlog.author || 'Anonymous';
  
  // Format date
  const date = new Date(objectBlog.publishedDate || objectBlog.createdAt);
  const formattedDate = date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  publishDate.textContent = formattedDate;
  
  categoryName.textContent = objectBlog.category || 'Uncategorized';
  viewCount.textContent = objectBlog.views || 0;

  // Display image
  if (objectBlog.image) {
    blogImage.src = objectBlog.image;
    blogImage.alt = objectBlog.title;
    blogImage.style.display = 'block';
    blogImage.onerror = function() {
      this.style.display = 'none';
    };
  }

  // Display excerpt
  if (objectBlog.excerpt) {
    blogExcerpt.textContent = objectBlog.excerpt;
  }

  // Display content with proper formatting
  if (objectBlog.content) {
    // Convert line breaks to paragraphs
    const contentParagraphs = objectBlog.content.split('\n\n');
    blogContent.innerHTML = contentParagraphs
      .map(para => {
        // Check if it's a heading (starts with ##)
        if (para.trim().startsWith('##')) {
          const headingText = para.trim().replace(/^##\s*/, '');
          return `<h2>${headingText}</h2>`;
        }
        // Check if it's a bold heading (starts with **)
        else if (para.trim().startsWith('**') && para.trim().endsWith('**')) {
          const boldText = para.trim().replace(/^\*\*|\*\*$/g, '');
          return `<h3>${boldText}</h3>`;
        }
        // Regular paragraph
        else {
          // Replace **text** with <strong>text</strong>
          const formattedPara = para.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          return `<p>${formattedPara}</p>`;
        }
      })
      .join('');
  }

  // Display tags
  if (objectBlog.tags && objectBlog.tags.length > 0) {
    tagsContainer.innerHTML = '<h3>Tags</h3>';
    const tagsWrapper = document.createElement('div');
    tagsWrapper.className = 'tags-wrapper';
    
    objectBlog.tags.forEach(tag => {
      const tagElement = document.createElement('span');
      tagElement.className = 'tag-badge';
      tagElement.innerHTML = `<i class="fas fa-hashtag"></i> ${tag}`;
      tagsWrapper.appendChild(tagElement);
    });
    
    tagsContainer.appendChild(tagsWrapper);
  }
  
  // Add author box
  addAuthorBox(objectBlog.author || 'Anonymous');
}

function addAuthorBox(authorName) {
  const tagsContainer = document.querySelector("#blog-tags-container");
  const authorBox = document.createElement('div');
  authorBox.className = 'author-box';
  
  const initial = authorName.charAt(0).toUpperCase();
  
  authorBox.innerHTML = `
    <div class="author-avatar">${initial}</div>
    <div class="author-info">
      <h4>Written by ${authorName}</h4>
      <p>Travel enthusiast and content creator, sharing experiences and tips to make your travels unforgettable.</p>
    </div>
  `;
  
  tagsContainer.after(authorBox);
}

function initScrollToTop() {
  const scrollBtn = document.createElement('button');
  scrollBtn.className = 'scroll-to-top';
  scrollBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
  scrollBtn.setAttribute('aria-label', 'Scroll to top');
  document.body.appendChild(scrollBtn);
  
  window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
      scrollBtn.classList.add('show');
    } else {
      scrollBtn.classList.remove('show');
    }
  });
  
  scrollBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

function initSocialShare(blog) {
  const currentUrl = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(blog.title);
  const imageUrl = encodeURIComponent(blog.image || '');
  
  // Try to find or create sidebar
  let sidebar = document.querySelector('.blog-sidebar');
  if (!sidebar) {
    // Create sidebar if it doesn't exist
    const mainWrapper = document.querySelector('.blog-main-wrapper');
    if (mainWrapper) {
      sidebar = document.createElement('div');
      sidebar.className = 'blog-sidebar';
      mainWrapper.appendChild(sidebar);
    } else {
      return; // Can't add sidebar without proper structure
    }
  }
  
  const shareBox = document.createElement('div');
  shareBox.className = 'share-buttons';
  shareBox.innerHTML = `
    <h4><i class="fas fa-share-alt"></i> Share This</h4>
    <div class="share-icons">
      <a href="https://www.facebook.com/sharer/sharer.php?u=${currentUrl}" 
         target="_blank" 
         class="share-btn facebook">
        <i class="fab fa-facebook-f"></i> Facebook
      </a>
      <a href="https://twitter.com/intent/tweet?url=${currentUrl}&text=${title}" 
         target="_blank" 
         class="share-btn twitter">
        <i class="fab fa-twitter"></i> Twitter
      </a>
      <a href="https://www.linkedin.com/sharing/share-offsite/?url=${currentUrl}" 
         target="_blank" 
         class="share-btn linkedin">
        <i class="fab fa-linkedin-in"></i> LinkedIn
      </a>
      <a href="https://pinterest.com/pin/create/button/?url=${currentUrl}&media=${imageUrl}&description=${title}" 
         target="_blank" 
         class="share-btn pinterest">
        <i class="fab fa-pinterest-p"></i> Pinterest
      </a>
      <a href="https://wa.me/?text=${title}%20${currentUrl}" 
         target="_blank" 
         class="share-btn whatsapp">
        <i class="fab fa-whatsapp"></i> WhatsApp
      </a>
    </div>
  `;
  
  sidebar.prepend(shareBox);
}