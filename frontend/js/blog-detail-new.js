// Enhanced Blog Detail JavaScript with Modern Features
document.addEventListener('DOMContentLoaded', function() {
    console.log('Enhanced blog detail page loaded');
    
    // Initialize all features
    initializeBlogDetail();
    setupReadingProgress();
    setupScrollToTop();
    setupSocialShare();
    setupArticleActions();
    setupNewsletter();
    setupRatingSystem();
    setupTableOfContents();
    
    // Load blog data
    loadBlogData();
});

// Reading Progress Bar
function setupReadingProgress() {
    const progressBar = document.querySelector('.reading-progress');
    
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const maxHeight = document.body.scrollHeight - window.innerHeight;
        const progress = (scrolled / maxHeight) * 100;
        
        if (progressBar) {
            progressBar.style.width = Math.min(progress, 100) + '%';
        }
    });
}

// Scroll to Top Button
function setupScrollToTop() {
    const scrollBtn = document.getElementById('scroll-to-top');
    
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }
    });
    
    scrollBtn?.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Social Share Functionality
function setupSocialShare() {
    const shareButtons = document.querySelectorAll('.share-btn');
    const currentUrl = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(document.title);
    
    shareButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            
            const platform = btn.classList[1]; // facebook, twitter, etc.
            let shareUrl = '';
            
            switch(platform) {
                case 'facebook':
                    shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${currentUrl}`;
                    break;
                case 'twitter':
                    shareUrl = `https://twitter.com/intent/tweet?url=${currentUrl}&text=${title}`;
                    break;
                case 'linkedin':
                    shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${currentUrl}`;
                    break;
                case 'whatsapp':
                    shareUrl = `https://wa.me/?text=${title}%20${currentUrl}`;
                    break;
                case 'copy':
                    navigator.clipboard.writeText(window.location.href).then(() => {
                        showToast('Link copied to clipboard!', 'success');
                    });
                    return;
            }
            
            if (shareUrl) {
                window.open(shareUrl, '_blank', 'width=600,height=400');
            }
        });
    });
}

// Article Actions (Like, Bookmark, etc.)
function setupArticleActions() {
    const actionButtons = document.querySelectorAll('.action-btn');
    
    actionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            const countElement = btn.querySelector('.action-count');
            
            switch(action) {
                case 'like':
                    btn.classList.toggle('active');
                    const isLiked = btn.classList.contains('active');
                    const heartIcon = btn.querySelector('i');
                    
                    if (isLiked) {
                        heartIcon.className = 'fas fa-heart';
                        if (countElement) {
                            countElement.textContent = parseInt(countElement.textContent) + 1;
                        }
                        showToast('Article liked!', 'success');
                    } else {
                        heartIcon.className = 'far fa-heart';
                        if (countElement) {
                            countElement.textContent = Math.max(0, parseInt(countElement.textContent) - 1);
                        }
                    }
                    break;
                    
                case 'bookmark':
                    btn.classList.toggle('active');
                    const isBookmarked = btn.classList.contains('active');
                    const bookmarkIcon = btn.querySelector('i');
                    
                    if (isBookmarked) {
                        bookmarkIcon.className = 'fas fa-bookmark';
                        showToast('Article bookmarked!', 'success');
                    } else {
                        bookmarkIcon.className = 'far fa-bookmark';
                        showToast('Bookmark removed', 'info');
                    }
                    break;
                    
                case 'share':
                    document.querySelector('.share-widget').scrollIntoView({ behavior: 'smooth' });
                    break;
                    
                case 'comment':
                    // Scroll to comments section or open comment form
                    showToast('Comments feature coming soon!', 'info');
                    break;
            }
        });
    });
}

// Newsletter Subscription
function setupNewsletter() {
    const newsletterForm = document.querySelector('.newsletter-form');
    
    newsletterForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const emailInput = newsletterForm.querySelector('input[type="email"]');
        const email = emailInput.value.trim();
        
        if (!email) {
            showToast('Please enter your email address', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    email: email,
                    source: 'blog-detail'
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showToast('Successfully subscribed to newsletter!', 'success');
                emailInput.value = '';
            } else {
                showToast(result.error || 'Subscription failed', 'error');
            }
        } catch (error) {
            console.error('Newsletter subscription error:', error);
            showToast('Failed to subscribe. Please try again.', 'error');
        }
    });
}

// Rating System
function setupRatingSystem() {
    const ratingStars = document.querySelectorAll('.rating-stars i');
    const ratingText = document.querySelector('.rating-text');
    
    ratingStars.forEach((star, index) => {
        star.addEventListener('click', () => {
            const rating = index + 1;
            
            // Update visual stars
            ratingStars.forEach((s, i) => {
                if (i < rating) {
                    s.className = 'fas fa-star active';
                } else {
                    s.className = 'far fa-star';
                }
            });
            
            // Update text
            ratingText.textContent = `You rated this article ${rating} out of 5 stars`;
            
            // Save rating (you can implement API call here)
            showToast(`Thank you for rating! (${rating}/5 stars)`, 'success');
        });
        
        star.addEventListener('mouseenter', () => {
            const hoverRating = index + 1;
            ratingStars.forEach((s, i) => {
                if (i < hoverRating) {
                    s.className = 'fas fa-star';
                } else {
                    s.className = 'far fa-star';
                }
            });
        });
    });
    
    document.querySelector('.rating-stars')?.addEventListener('mouseleave', () => {
        // Reset to current rating or default
        ratingStars.forEach(star => {
            if (!star.classList.contains('active')) {
                star.className = 'far fa-star';
            }
        });
    });
}

// Table of Contents Generation
function setupTableOfContents() {
    const tocList = document.querySelector('.toc-list');
    const contentArea = document.querySelector('.blog-content');
    
    if (!tocList || !contentArea) return;
    
    const headings = contentArea.querySelectorAll('h2, h3, h4');
    
    if (headings.length === 0) {
        document.querySelector('.toc-widget').style.display = 'none';
        return;
    }
    
    tocList.innerHTML = '';
    
    headings.forEach((heading, index) => {
        const id = `heading-${index}`;
        heading.id = id;
        
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${id}`;
        a.textContent = heading.textContent;
        a.style.paddingLeft = heading.tagName === 'H3' ? '1rem' : heading.tagName === 'H4' ? '2rem' : '0';
        
        a.addEventListener('click', (e) => {
            e.preventDefault();
            heading.scrollIntoView({ behavior: 'smooth' });
        });
        
        li.appendChild(a);
        tocList.appendChild(li);
    });
    
    // Highlight current section on scroll
    window.addEventListener('scroll', () => {
        let current = '';
        headings.forEach(heading => {
            const rect = heading.getBoundingClientRect();
            if (rect.top <= 100) {
                current = heading.id;
            }
        });
        
        tocList.querySelectorAll('a').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
}

function initializeBlogDetail() {
    console.log('Initializing blog detail page...');
    
    // Set up smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Add animations when elements come into view
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    document.querySelectorAll('.sidebar-widget, .article-rating, .newsletter-signup').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Load Popular Articles for Sidebar
function loadPopularArticles() {
    const popularList = document.querySelector('.popular-articles');
    if (!popularList) return;
    
    // Sample popular articles data
    const popularArticles = [
        {
            title: "10 Hidden Gems in Southeast Asia",
            views: "2.5k",
            readTime: "8 min",
            url: "blog-detail.html?id=1"
        },
        {
            title: "Budget Travel Guide to Europe",
            views: "1.8k", 
            readTime: "12 min",
            url: "blog-detail.html?id=2"
        },
        {
            title: "Best Photography Spots in Japan",
            views: "3.2k",
            readTime: "6 min", 
            url: "blog-detail.html?id=3"
        }
    ];
    
    popularList.innerHTML = popularArticles.map(article => `
        <li>
            <a href="${article.url}" class="popular-article-item">
                <div class="popular-article-title">${article.title}</div>
                <div class="popular-article-meta">
                    <span><i class="fas fa-eye"></i> ${article.views}</span>
                    <span><i class="fas fa-clock"></i> ${article.readTime}</span>
                </div>
            </a>
        </li>
    `).join('');
}

// Load Related Articles
function loadRelatedArticles() {
    const relatedGrid = document.querySelector('.related-grid');
    if (!relatedGrid) return;
    
    // Sample related articles data
    const relatedArticles = [
        {
            title: "Amazing Beaches in Thailand",
            excerpt: "Discover the most beautiful beaches Thailand has to offer...",
            image: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=400&h=250&fit=crop",
            category: "Destinations",
            author: "Travel Team",
            date: "Nov 3, 2024",
            url: "blog-detail.html?id=4"
        },
        {
            title: "Cultural Experiences in Vietnam", 
            excerpt: "Immerse yourself in the rich culture and traditions...",
            image: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&h=250&fit=crop",
            category: "Culture",
            author: "Travel Team", 
            date: "Nov 1, 2024",
            url: "blog-detail.html?id=5"
        },
        {
            title: "Adventure Activities in Bali",
            excerpt: "From volcano hiking to water sports, Bali offers...", 
            image: "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=400&h=250&fit=crop",
            category: "Adventure",
            author: "Travel Team",
            date: "Oct 30, 2024", 
            url: "blog-detail.html?id=6"
        }
    ];
    
    relatedGrid.innerHTML = relatedArticles.map(article => `
        <a href="${article.url}" class="related-article">
            <img src="${article.image}" alt="${article.title}" class="related-image">
            <div class="related-content">
                <div class="related-category">${article.category}</div>
                <h3 class="related-title">${article.title}</h3>
                <p class="related-excerpt">${article.excerpt}</p>
                <div class="related-meta">
                    <span><i class="fas fa-user"></i> ${article.author}</span>
                    <span><i class="fas fa-calendar"></i> ${article.date}</span>
                </div>
            </div>
        </a>
    `).join('');
}

function loadBlogData() {
    console.log('Loading blog data...');
    
    // Get blog ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const blogId = urlParams.get('id');
    
    console.log('Blog ID from URL:', blogId);
    
    if (!blogId) {
        console.error('No blog ID provided');
        showError('Blog post not found');
        return;
    }
    
    // Show loading state
    showLoadingState();
    
    // Try to load from API first
    fetch(`/api/blogs`)
        .then(response => {
            console.log('API response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        })
        .then(blogs => {
            console.log('Blogs loaded from API:', blogs.length);
            const blog = blogs.find(b => b.id == blogId);
            
            if (blog) {
                console.log('Found blog:', blog.title);
                displayBlogContent(blog);
            } else {
                console.log('Blog not found in API data, trying sample data...');
                loadSampleBlogData(blogId);
            }
        })
        .catch(error => {
            console.error('Error loading from API:', error);
            console.log('Falling back to sample data...');
            loadSampleBlogData(blogId);
        });
}

function loadSampleBlogData(blogId) {
    console.log('Loading sample blog data for ID:', blogId);
    
    // Sample blog data with multiple posts
    const sampleBlogs = [
        {
            id: 1,
            title: "Hidden Gems of Vietnam: Unexplored Destinations",
            excerpt: "Discover the most beautiful and lesser-known destinations in Vietnam that will take your breath away. From pristine beaches to mystical mountains.",
            content: `
                <h2>Introduction to Vietnam's Hidden Treasures</h2>
                <p>Vietnam is a country of stunning natural beauty, rich culture, and incredible diversity. While popular destinations like Hanoi, Ho Chi Minh City, and Ha Long Bay attract millions of visitors, there are countless hidden gems waiting to be discovered.</p>
                
                <h3>1. Phong Nha-Ke Bang National Park</h3>
                <p>Home to the world's largest cave systems, this UNESCO World Heritage site offers incredible underground adventures. The Son Tra Cave and Phong Nha Cave are must-visit attractions for adventure seekers.</p>
                
                <h3>2. Mu Cang Chai Rice Terraces</h3>
                <p>These spectacular rice terraces in northern Vietnam are best visited during harvest season (September-October) when the golden rice creates a breathtaking landscape.</p>
                
                <h3>3. Con Dao Islands</h3>
                <p>Once a prison island, Con Dao has transformed into a pristine archipelago with crystal-clear waters, diverse marine life, and beautiful beaches perfect for diving and snorkeling.</p>
                
                <h2>Planning Your Adventure</h2>
                <p>When planning your trip to these hidden destinations, consider the best time to visit each location and prepare for unique experiences that showcase Vietnam's natural beauty and cultural heritage.</p>
            `,
            author: "Travel Explorer",
            publishDate: "2024-11-05",
            category: "Destinations",
            tags: ["Vietnam", "Hidden Gems", "Adventure", "Nature"],
            image: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200&h=600&fit=crop",
            views: 1245,
            readingTime: 8
        },
        {
            id: 2,
            title: "Ultimate Street Food Guide to Thailand",
            excerpt: "Explore the vibrant street food culture of Thailand with our comprehensive guide to the most delicious and authentic local dishes.",
            content: `
                <h2>Thailand's Street Food Paradise</h2>
                <p>Thailand's street food scene is legendary, offering an incredible variety of flavors, textures, and aromas that define the country's culinary identity.</p>
                
                <h3>Must-Try Street Food Dishes</h3>
                <p><strong>Pad Thai:</strong> The most famous Thai dish, featuring stir-fried rice noodles with shrimp, tofu, or chicken.</p>
                <p><strong>Som Tam:</strong> A refreshing green papaya salad that perfectly balances sweet, sour, and spicy flavors.</p>
                <p><strong>Mango Sticky Rice:</strong> A beloved dessert combining sweet mango with coconut sticky rice.</p>
                
                <h3>Best Street Food Destinations</h3>
                <p>Bangkok's Chatuchak Weekend Market, Chiang Mai's Night Bazaar, and Phuket's local markets offer the most diverse street food experiences.</p>
            `,
            author: "Food Critic",
            publishDate: "2024-11-03",
            category: "Food & Culture",
            tags: ["Thailand", "Street Food", "Cuisine", "Travel Tips"],
            image: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1200&h=600&fit=crop",
            views: 2156,
            readingTime: 6
        }
    ];
    
    const blog = sampleBlogs.find(b => b.id == blogId) || sampleBlogs[0];
    
    console.log('Using sample blog:', blog.title);
    displayBlogContent(blog);
}

function displayBlogContent(blog) {
    console.log('Displaying blog content:', blog.title);
    
    try {
        // Update meta information
        document.title = `${blog.title} - CMP Travel`;
        
        // Update hero content
        const heroImage = document.getElementById('blog-main-image');
        const blogTitle = document.querySelector('.blog-title');
        const authorName = document.getElementById('author-name');
        const publishDate = document.getElementById('publish-date');
        const categoryName = document.getElementById('category-name');
        const viewCount = document.getElementById('view-count');
        const readingTime = document.getElementById('reading-time');
        
        if (heroImage && blog.image) {
            heroImage.src = blog.image;
            heroImage.alt = blog.title;
            heroImage.style.display = 'block';
        }
        
        if (blogTitle) {
            blogTitle.innerHTML = blog.title;
        }
        
        if (authorName) {
            authorName.textContent = blog.author || 'CMP Travel Team';
        }
        
        if (publishDate) {
            const date = new Date(blog.publishDate);
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
            viewCount.textContent = blog.views || Math.floor(Math.random() * 1000) + 500;
        }
        
        if (readingTime) {
            readingTime.textContent = blog.readingTime || 5;
        }
        
        // Update excerpt
        const blogExcerpt = document.getElementById('blog-excerpt');
        if (blogExcerpt) {
            blogExcerpt.textContent = blog.excerpt || '';
        }
        
        // Update main content
        const blogContent = document.getElementById('blog-content-text');
        if (blogContent) {
            blogContent.innerHTML = blog.content || '<p>Content coming soon...</p>';
        }
        
        // Update tags
        const tagsContainer = document.getElementById('blog-tags-container');
        if (tagsContainer && blog.tags) {
            tagsContainer.innerHTML = `
                <h4><i class="fas fa-tags"></i> Tags</h4>
                <div class="tags-wrapper">
                    ${blog.tags.map(tag => `
                        <a href="#" class="tag">
                            <i class="fas fa-tag"></i> ${tag}
                        </a>
                    `).join('')}
                </div>
            `;
        }
        
        // Update sidebar author info
        const authorNameSidebar = document.getElementById('author-name-sidebar');
        if (authorNameSidebar) {
            authorNameSidebar.textContent = blog.author || 'CMP Travel Team';
        }
        
        // Load additional content
        loadPopularArticles();
        loadRelatedArticles();
        
        // Setup table of contents after content is loaded
        setTimeout(() => {
            setupTableOfContents();
        }, 100);
        
        // Hide loading state
        hideLoadingState();
        
        console.log('Blog content displayed successfully');
        
    } catch (error) {
        console.error('Error displaying blog content:', error);
        showError('Failed to display blog content');
    }
}

function showLoadingState() {
    // Loading states are already in HTML, just ensure they're visible
    console.log('Showing loading state');
}

function hideLoadingState() {
    // Remove loading spinners and show actual content
    const loadingElements = document.querySelectorAll('.fa-spinner');
    loadingElements.forEach(el => {
        el.classList.remove('fa-spinner', 'fa-spin');
        el.classList.add('fa-check');
    });
}

function showError(message) {
    console.error('Error:', message);
    
    const blogTitle = document.querySelector('.blog-title');
    const blogContent = document.getElementById('blog-content-text');
    
    if (blogTitle) {
        blogTitle.innerHTML = 'Blog Post Not Found';
    }
    
    if (blogContent) {
        blogContent.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ff6600; margin-bottom: 1rem;"></i>
                <h3>Oops! Something went wrong</h3>
                <p>${message}</p>
                <a href="blog.html" class="btn-back">
                    <i class="fas fa-arrow-left"></i> Back to Blog
                </a>
            </div>
        `;
    }
}

// Toast notification function
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 5px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Hide toast after 3 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}
