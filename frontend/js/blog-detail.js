document.addEventListener('DOMContentLoaded', function() {
    // Initialize all features
    loadBlogContent(); // Load content first
    initializeReadingProgress();
    initializeTableOfContents();
    initializeQuickActions();
    initializeArticleRating();
    initializeNewsletterSignup();
    initializeSocialSharing();
    loadRelatedArticles();
    loadPopularArticles();
    initializeScrollToTop();

    // Reading Progress Bar
    function initializeReadingProgress() {
        const progressBar = document.querySelector('.reading-progress');
        const article = document.querySelector('.blog-article');
        const progressPercentage = document.querySelector('.progress-percentage');
        const progressCircle = document.querySelector('.progress-ring-circle');
        
        if (!progressBar || !article) return;

        function updateProgress() {
            const articleTop = article.offsetTop;
            const articleHeight = article.offsetHeight;
            const windowHeight = window.innerHeight;
            const scrollTop = window.pageYOffset;
            
            const articleBottom = articleTop + articleHeight;
            const windowBottom = scrollTop + windowHeight;
            
            let progress = 0;
            
            if (scrollTop >= articleTop - windowHeight) {
                if (windowBottom >= articleBottom) {
                    progress = 100;
                } else {
                    const scrolledIntoArticle = windowBottom - articleTop;
                    const totalScrollableDistance = articleHeight + windowHeight;
                    progress = (scrolledIntoArticle / totalScrollableDistance) * 100;
                }
            }
            
            progress = Math.max(0, Math.min(100, progress));
            
            // Update progress bar
            progressBar.style.width = progress + '%';
            
            // Update circular progress
            if (progressPercentage) {
                progressPercentage.textContent = Math.round(progress) + '%';
            }
            
            if (progressCircle) {
                const circumference = 2 * Math.PI * 20; // radius = 20
                const dashArray = (progress / 100) * circumference;
                progressCircle.style.strokeDasharray = `${dashArray} ${circumference}`;
            }
        }

        window.addEventListener('scroll', updateProgress);
        updateProgress();
    }

    // Table of Contents
    function initializeTableOfContents() {
        const tocList = document.querySelector('.toc-list');
        if (!tocList) return;

        const headings = document.querySelectorAll('.blog-content h2, .blog-content h3');
        const tocItems = [];

        headings.forEach((heading, index) => {
            const id = heading.id || `heading-${index}`;
            heading.id = id;
            heading.style.scrollMarginTop = '120px';

            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = `#${id}`;
            a.textContent = heading.textContent;
            a.addEventListener('click', function(e) {
                e.preventDefault();
                document.getElementById(id).scrollIntoView({
                    behavior: 'smooth'
                });
            });

            li.appendChild(a);
            tocList.appendChild(li);
            tocItems.push({ element: a, target: heading });
        });

        // Update active TOC item on scroll
        function updateActiveTocItem() {
            let current = '';
            headings.forEach(heading => {
                const rect = heading.getBoundingClientRect();
                if (rect.top <= 150) {
                    current = heading.id;
                }
            });

            tocItems.forEach(item => {
                item.element.classList.remove('active');
                if (item.target.id === current) {
                    item.element.classList.add('active');
                }
            });
        }

        window.addEventListener('scroll', updateActiveTocItem);
    }

    // Quick Actions Bar
    function initializeQuickActions() {
        const likeBtn = document.querySelector('.action-btn[data-action="like"]');
        const bookmarkBtn = document.querySelector('.action-btn[data-action="bookmark"]');
        const shareBtn = document.querySelector('.action-btn[data-action="share"]');
        const commentBtn = document.querySelector('.action-btn[data-action="comment"]');

        if (likeBtn) {
            likeBtn.addEventListener('click', function() {
                this.classList.toggle('active');
                const count = this.querySelector('.count');
                const currentCount = parseInt(count.textContent) || 0;
                count.textContent = this.classList.contains('active') ? 
                    currentCount + 1 : Math.max(0, currentCount - 1);
            });
        }

        if (bookmarkBtn) {
            bookmarkBtn.addEventListener('click', function() {
                this.classList.toggle('active');
                const icon = this.querySelector('i');
                icon.className = this.classList.contains('active') ? 
                    'fas fa-bookmark' : 'far fa-bookmark';
            });
        }

        if (shareBtn) {
            shareBtn.addEventListener('click', function() {
                if (navigator.share) {
                    navigator.share({
                        title: document.title,
                        url: window.location.href
                    });
                } else {
                    // Fallback to copy URL
                    navigator.clipboard.writeText(window.location.href).then(() => {
                        showToast('Link copied to clipboard!');
                    });
                }
            });
        }

        if (commentBtn) {
            commentBtn.addEventListener('click', function() {
                const commentsSection = document.querySelector('#comments');
                if (commentsSection) {
                    commentsSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
    }

    // Article Rating System
    function initializeArticleRating() {
        const stars = document.querySelectorAll('.stars i');
        const ratingText = document.querySelector('.rating-text');
        let currentRating = 0;

        stars.forEach((star, index) => {
            star.addEventListener('mouseover', function() {
                highlightStars(index + 1);
            });

            star.addEventListener('click', function() {
                currentRating = index + 1;
                highlightStars(currentRating);
                updateRatingText(currentRating);
                // Here you would send the rating to your backend
                console.log('User rated:', currentRating);
            });
        });

        function highlightStars(rating) {
            stars.forEach((star, index) => {
                if (index < rating) {
                    star.classList.add('active');
                } else {
                    star.classList.remove('active');
                }
            });
        }

        function updateRatingText(rating) {
            const ratingTexts = {
                1: 'Poor',
                2: 'Fair', 
                3: 'Good',
                4: 'Very Good',
                5: 'Excellent'
            };
            if (ratingText) {
                ratingText.textContent = `You rated this article: ${ratingTexts[rating]}`;
            }
        }
    }

    // Newsletter Signup
    function initializeNewsletterSignup() {
        const newsletterForms = document.querySelectorAll('.newsletter-form');
        
        newsletterForms.forEach(form => {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const emailInput = this.querySelector('input[type="email"]');
                const submitBtn = this.querySelector('button');
                const email = emailInput.value.trim();
                
                if (!email) {
                    showToast('Please enter your email address', 'error');
                    return;
                }
                
                if (!isValidEmail(email)) {
                    showToast('Please enter a valid email address', 'error');
                    return;
                }
                
                // Show loading state
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subscribing...';
                submitBtn.disabled = true;
                
                try {
                    const response = await fetch('/api/newsletter/subscribe', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ 
                            email: email,
                            source: 'blog-detail'
                        }),
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        showToast('Thank you for subscribing! 🎉', 'success');
                        emailInput.value = '';
                    } else {
                        showToast(data.message || 'Subscription failed. Please try again.', 'error');
                    }
                } catch (error) {
                    console.error('Newsletter subscription error:', error);
                    showToast('Network error. Please try again.', 'error');
                } finally {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            });
        });
    }

    // Social Sharing
    function initializeSocialSharing() {
        const shareButtons = document.querySelectorAll('[class*="share-btn"]');
        const currentUrl = encodeURIComponent(window.location.href);
        const currentTitle = encodeURIComponent(document.title);
        
        shareButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                
                const platform = this.classList.contains('facebook') ? 'facebook' :
                               this.classList.contains('twitter') ? 'twitter' :
                               this.classList.contains('linkedin') ? 'linkedin' :
                               this.classList.contains('whatsapp') ? 'whatsapp' :
                               this.classList.contains('email') ? 'email' :
                               this.classList.contains('copy') ? 'copy' : null;
                
                if (platform) {
                    shareOnPlatform(platform, currentUrl, currentTitle);
                }
            });
        });
    }

    function shareOnPlatform(platform, url, title) {
        let shareUrl = '';
        
        switch(platform) {
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
                break;
            case 'linkedin':
                shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
                break;
            case 'whatsapp':
                shareUrl = `https://wa.me/?text=${title}%20${url}`;
                break;
            case 'email':
                shareUrl = `mailto:?subject=${title}&body=Check out this article: ${url}`;
                break;
            case 'copy':
                navigator.clipboard.writeText(decodeURIComponent(url)).then(() => {
                    showToast('Link copied to clipboard!', 'success');
                });
                return;
        }
        
        if (shareUrl) {
            window.open(shareUrl, '_blank', 'width=600,height=400');
        }
    }

    // Load Blog Content
    async function loadBlogContent() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const blogId = urlParams.get('id');
            
            if (!blogId) {
                showError('No blog ID provided');
                return;
            }

            showLoadingState();

            // Load blog data from API
            const blog = await loadBlogData(blogId);
            if (blog) {
                updateBlogDisplay(blog);
                hideLoadingState();
            } else {
                showError('Blog not found');
            }
        } catch (error) {
            console.error('Error loading blog content:', error);
            showError('Failed to load blog content');
        }
    }

    async function loadBlogData(blogId) {
        try {
            console.log('Loading blog with ID:', blogId);
            
            // Try to fetch from API first
            const response = await fetch('/api/blogs');
            if (response.ok) {
                const blogs = await response.json();
                console.log('Available blogs:', blogs.length);
                
                const blog = blogs.find(blog => blog._id === blogId);
                if (blog) {
                    console.log('Found blog:', blog.title);
                    return blog;
                }
                
                console.log('Blog not found in API, trying by index...');
                // Try to get blog by index if _id doesn't match
                const blogIndex = parseInt(blogId) - 1;
                if (blogIndex >= 0 && blogIndex < blogs.length) {
                    console.log('Found blog by index:', blogs[blogIndex].title);
                    return blogs[blogIndex];
                }
            }
        } catch (error) {
            console.error('API request failed, trying fallback:', error);
        }

        // Fallback to local data
        try {
            const response = await fetch('/data/blog.json');
            if (response.ok) {
                const blogs = await response.json();
                const blog = blogs.find(blog => blog.id == blogId);
                if (blog) {
                    console.log('Found blog in fallback data:', blog.title);
                    return blog;
                }
            }
        } catch (error) {
            console.error('Error loading fallback blog data:', error);
        }
        
        console.error('Blog not found anywhere, using sample data');
        
        // Return sample blog for testing
        return {
            _id: blogId,
            title: "Discover Amazing Travel Destinations",
            author: "CMP Travel Team",
            excerpt: "Join us on an incredible journey to explore the world's most beautiful destinations.",
            content: `
                <h2>Welcome to Our Travel Blog</h2>
                <p>Welcome to our travel blog! Here you'll find amazing stories, tips, and guides for your next adventure.</p>
                
                <h3>What We Offer</h3>
                <ul>
                    <li>Detailed destination guides</li>
                    <li>Travel tips and tricks</li>
                    <li>Cultural insights</li>
                    <li>Budget-friendly options</li>
                </ul>
                
                <h3>Start Your Journey</h3>
                <p>Whether you're planning a quick weekend getaway or a month-long adventure, we have something for everyone. Our experienced travel writers share their personal experiences to help you make the most of your travels.</p>
                
                <blockquote>
                    <p>"Travel is the only thing you buy that makes you richer." - Anonymous</p>
                </blockquote>
                
                <p>Don't forget to subscribe to our newsletter for the latest travel updates and exclusive deals!</p>
            `,
            image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800",
            category: "Travel Tips",
            tags: ["travel", "destinations", "tips", "adventure"],
            publishedDate: new Date().toISOString(),
            viewCount: 156
        };
    }

    function showLoadingState() {
        const title = document.querySelector('.blog-title');
        const authorName = document.getElementById('author-name');
        const publishDate = document.getElementById('publish-date');
        const categoryName = document.getElementById('category-name');
        const blogContent = document.getElementById('blog-content-text');
        const blogExcerpt = document.getElementById('blog-excerpt');
        
        if (title) title.innerHTML = '<i class="fas fa-spinner fa-spin" style="color: #ff6600;"></i> Loading...';
        if (authorName) authorName.textContent = 'Loading...';
        if (publishDate) publishDate.textContent = 'Loading...';
        if (categoryName) categoryName.textContent = 'Loading...';
        if (blogContent) blogContent.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin" style="color: #ff6600; font-size: 2rem;"></i><br><br>Loading content...</div>';
        if (blogExcerpt) blogExcerpt.textContent = '';
    }

    function hideLoadingState() {
        // Loading state will be replaced by actual content
    }

    function showError(message) {
        const title = document.querySelector('.blog-title');
        const blogContent = document.getElementById('blog-content-text');
        
        if (title) title.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #e53e3e;"></i> Error';
        if (blogContent) {
            blogContent.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #e53e3e; margin-bottom: 20px;"></i>
                    <h3 style="color: #e53e3e; margin-bottom: 10px;">Oops! Something went wrong</h3>
                    <p style="color: #666; margin-bottom: 30px;">${message}</p>
                    <a href="blog.html" style="background: #ff6600; color: white; padding: 12px 25px; border-radius: 25px; text-decoration: none;">
                        Back to Blog
                    </a>
                </div>
            `;
        }
    }

    function updateBlogDisplay(blog) {
        // Update hero section
        const heroImage = document.getElementById('blog-main-image');
        const title = document.querySelector('.blog-title');
        const excerpt = document.getElementById('blog-excerpt');
        const content = document.getElementById('blog-content-text');
        const authorName = document.getElementById('author-name');
        const publishDate = document.getElementById('publish-date');
        const categoryName = document.getElementById('category-name');
        const viewCount = document.getElementById('view-count');

        // Update title
        if (title) {
            title.textContent = blog.title;
            document.title = `${blog.title} - CMP Travel Blog`;
        }

        // Update hero image
        if (heroImage && blog.image) {
            heroImage.src = blog.image;
            heroImage.alt = blog.title;
            heroImage.style.display = 'block';
        }

        // Update excerpt
        if (excerpt) {
            excerpt.textContent = blog.excerpt || blog.content?.substring(0, 200) + '...' || '';
        }

        // Update content
        if (content) {
            content.innerHTML = blog.content || '';
        }

        // Update meta information
        if (authorName) {
            authorName.textContent = blog.author || 'CMP Travel Team';
        }

        if (publishDate) {
            const date = new Date(blog.publishedDate || blog.createdAt || blog.date);
            publishDate.textContent = date.toLocaleDateString('en-US', { 
                year: 'numeric',
                month: 'long', 
                day: 'numeric'
            });
        }

        if (categoryName) {
            categoryName.textContent = blog.category || 'Travel';
        }

        if (viewCount) {
            viewCount.textContent = blog.viewCount || Math.floor(Math.random() * 500) + 100;
        }

        // Update tags
        const tagsContainer = document.getElementById('blog-tags-container');
        if (tagsContainer && blog.tags && blog.tags.length > 0) {
            tagsContainer.innerHTML = `
                <h4>Tags:</h4>
                <div class="tags-wrapper">
                    ${blog.tags.map(tag => 
                        `<span class="tag-badge">
                            <i class="fas fa-tag"></i> ${tag}
                        </span>`
                    ).join('')}
                </div>
            `;
        }

        // Update meta tags for SEO
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.name = 'description';
            document.head.appendChild(metaDesc);
        }
        metaDesc.content = blog.excerpt || blog.content?.substring(0, 160) || '';
    }

    // Load Related Articles
    async function loadRelatedArticles() {
        try {
            // Try API first
            let blogs = [];
            try {
                const response = await fetch('/api/blogs');
                if (response.ok) {
                    const allBlogs = await response.json();
                    blogs = allBlogs.filter(blog => blog.status === 'published');
                }
            } catch (error) {
                console.error('API request failed, trying fallback:', error);
                // Fallback to local data
                const response = await fetch('/data/blog.json');
                blogs = await response.json();
            }
            
            // Get random 3 blogs for related articles (excluding current blog)
            const urlParams = new URLSearchParams(window.location.search);
            const currentBlogId = urlParams.get('id');
            
            const relatedBlogs = blogs
                .filter(blog => (blog._id || blog.id) !== currentBlogId)
                .sort(() => 0.5 - Math.random())
                .slice(0, 3);
                
            displayRelatedArticles(relatedBlogs);
        } catch (error) {
            console.error('Error loading related articles:', error);
        }
    }

    function displayRelatedArticles(blogs) {
        const relatedGrid = document.querySelector('.related-grid');
        if (!relatedGrid) return;

        relatedGrid.innerHTML = blogs.map(blog => `
            <div class="related-card">
                <img src="${blog.image || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400'}" 
                     alt="${blog.title}"
                     onerror="this.src='https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400'">
                <div class="related-card-content">
                    <h4><a href="blog-detail.html?id=${blog._id || blog.id}">${blog.title}</a></h4>
                    <div class="related-card-meta">
                        <i class="fas fa-calendar"></i>
                        <span>${new Date(blog.publishedDate || blog.createdAt || blog.date).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Load Popular Articles for Sidebar
    async function loadPopularArticles() {
        try {
            const response = await fetch('/data/blog.json');
            const blogs = await response.json();
            
            // Get random 5 blogs for popular articles
            const popularBlogs = blogs.sort(() => 0.5 - Math.random()).slice(0, 5);
            displayPopularArticles(popularBlogs);
        } catch (error) {
            console.error('Error loading popular articles:', error);
        }
    }

    function displayPopularArticles(blogs) {
        const popularList = document.querySelector('.popular-articles');
        if (!popularList) return;

        popularList.innerHTML = blogs.map(blog => `
            <li class="popular-article-item">
                <img src="${blog.image}" alt="${blog.title}">
                <div class="popular-article-content">
                    <h4><a href="/blog-detail.html?id=${blog.id}">${blog.title}</a></h4>
                    <div class="popular-article-meta">
                        <i class="fas fa-calendar"></i>
                        <span>${new Date(blog.date).toLocaleDateString()}</span>
                    </div>
                </div>
            </li>
        `).join('');
    }

    // Scroll to Top Button
    function initializeScrollToTop() {
        const scrollToTopBtn = document.querySelector('.scroll-to-top');
        
        if (scrollToTopBtn) {
            window.addEventListener('scroll', function() {
                if (window.pageYOffset > 300) {
                    scrollToTopBtn.classList.add('visible');
                } else {
                    scrollToTopBtn.classList.remove('visible');
                }
            });

            scrollToTopBtn.addEventListener('click', function() {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }
    }

    // Utility Functions
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add toast styles if not already added
        if (!document.querySelector('#toast-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.textContent = `
                .toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    padding: 15px 20px;
                    border-radius: 8px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                    z-index: 10000;
                    opacity: 0;
                    transform: translateX(100%);
                    transition: all 0.3s ease;
                    border-left: 4px solid #007bff;
                }
                .toast.toast-success { border-left-color: #28a745; }
                .toast.toast-error { border-left-color: #dc3545; }
                .toast.show {
                    opacity: 1;
                    transform: translateX(0);
                }
                .toast-content {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .toast-content i {
                    color: #007bff;
                }
                .toast.toast-success .toast-content i { color: #28a745; }
                .toast.toast-error .toast-content i { color: #dc3545; }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(toast);

        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);

        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }
});