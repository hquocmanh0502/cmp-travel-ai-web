window.addEventListener("DOMContentLoaded", async () => {
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
    tagsContainer.innerHTML = '<h3>Tags:</h3>';
    const tagsWrapper = document.createElement('div');
    tagsWrapper.className = 'tags-wrapper';
    
    objectBlog.tags.forEach(tag => {
      const tagElement = document.createElement('span');
      tagElement.className = 'tag-badge';
      tagElement.innerHTML = `<i class="fas fa-tag"></i> ${tag}`;
      tagsWrapper.appendChild(tagElement);
    });
    
    tagsContainer.appendChild(tagsWrapper);
  }
});