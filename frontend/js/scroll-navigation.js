/**
 * Smart Scroll Navigation
 * Automatically detects important sections and scrolls between them
 */

(function() {
    'use strict';
    
    // Configuration
    const CONFIG = {
        scrollOffset: 80, // Offset from top when scrolling to section
        scrollBehavior: 'smooth',
        minSectionHeight: 100, // Minimum height to consider a section important (reduced from 150)
        showScrollUpThreshold: 300, // Show scroll up button after scrolling this much
        sectionTolerance: 100, // Tolerance for detecting current section (pixels)
        throttleDelay: 100 // Throttle delay for scroll events
    };
    
    // Important section selectors (in order of priority)
    const SECTION_SELECTORS = [
        'header',
        'nav',
        '.hero',
        '.banner',
        'section',
        '.section',
        '.container:not(.scroll-nav-container)',
        '.content',
        '.main-content',
        '.bookings-container',
        '.content-section',
        '.gallery-grid',
        '.image-grid',
        '.card-container',
        '.features',
        '.services',
        'main > div',
        'article',
        '.wrapper',
        'footer'
    ];
    
    let importantSections = [];
    let isScrolling = false;
    let scrollTimeout = null;
    let lastScrollTime = 0;
    
    /**
     * Find all important sections on the page
     */
    function findImportantSections() {
        importantSections = [];
        
        // Special handling for gallery page
        const isGalleryPage = window.location.pathname.includes('gallery.html') || 
                             document.querySelector('.gallerymain');
        
        if (isGalleryPage) {
            console.log('🖼️ Gallery page detected - using special section detection');
            
            // Get header
            const header = document.querySelector('header');
            if (header) {
                const rect = header.getBoundingClientRect();
                importantSections.push({
                    element: header,
                    top: window.pageYOffset + rect.top,
                    bottom: window.pageYOffset + rect.top + rect.height,
                    height: rect.height,
                    id: 'Header'
                });
            }
            
            // Get main portfolio grid section
            const portfolioSection = document.querySelector('.gallerymain .container1');
            if (portfolioSection) {
                const rect = portfolioSection.getBoundingClientRect();
                importantSections.push({
                    element: portfolioSection,
                    top: window.pageYOffset + rect.top,
                    bottom: window.pageYOffset + rect.top + rect.height,
                    height: rect.height,
                    id: 'Portfolio Grid'
                });
            }
            
            // Get all gallery category sections (Nature, Valley, Ocean, etc.)
            const gallerySelectors = [
                '.gallery1',
                '.gallery2', 
                '.gallery3',
                '.gallery4',
                '.gallery5',
                '.gallery6'
            ];
            
            gallerySelectors.forEach(selector => {
                const galleries = document.querySelectorAll(selector);
                galleries.forEach((gallery, index) => {
                    const categoryName = gallery.querySelector('p');
                    const rect = gallery.getBoundingClientRect();
                    
                    if (rect.height >= CONFIG.minSectionHeight) {
                        importantSections.push({
                            element: gallery,
                            top: window.pageYOffset + rect.top,
                            bottom: window.pageYOffset + rect.top + rect.height,
                            height: rect.height,
                            id: categoryName ? categoryName.textContent.trim() : selector
                        });
                    }
                });
            });
            
            // Get discount section
            const discountSection = document.querySelector('.discount');
            if (discountSection) {
                const rect = discountSection.getBoundingClientRect();
                importantSections.push({
                    element: discountSection,
                    top: window.pageYOffset + rect.top,
                    bottom: window.pageYOffset + rect.top + rect.height,
                    height: rect.height,
                    id: 'Discount Offer'
                });
            }
            
            // Get footer
            const footer = document.querySelector('footer');
            if (footer) {
                const rect = footer.getBoundingClientRect();
                importantSections.push({
                    element: footer,
                    top: window.pageYOffset + rect.top,
                    bottom: window.pageYOffset + rect.top + rect.height,
                    height: rect.height,
                    id: 'Footer'
                });
            }
            
            // Sort by position
            importantSections.sort((a, b) => a.top - b.top);
            
            console.log('📍 Found', importantSections.length, 'gallery sections:', 
                        importantSections.map(s => s.id));
            return;
        }
        
        // Special handling for blog page
        const isBlogPage = window.location.pathname.includes('blog.html') || 
                          document.querySelector('.blog-controls');
        
        if (isBlogPage) {
            console.log('📰 Blog page detected - using special section detection');
            
            // Get header
            const header = document.querySelector('header');
            if (header) {
                const rect = header.getBoundingClientRect();
                importantSections.push({
                    element: header,
                    top: window.pageYOffset + rect.top,
                    bottom: window.pageYOffset + rect.top + rect.height,
                    height: rect.height,
                    id: 'Header'
                });
            }
            
            // Get blog controls (search & filter)
            const blogControls = document.querySelector('.blog-controls');
            if (blogControls) {
                const rect = blogControls.getBoundingClientRect();
                importantSections.push({
                    element: blogControls,
                    top: window.pageYOffset + rect.top,
                    bottom: window.pageYOffset + rect.top + rect.height,
                    height: rect.height,
                    id: 'Search & Filter'
                });
            }
            
            // Get social media section
            const socialSection = document.querySelector('.social-section');
            if (socialSection) {
                const rect = socialSection.getBoundingClientRect();
                importantSections.push({
                    element: socialSection,
                    top: window.pageYOffset + rect.top,
                    bottom: window.pageYOffset + rect.top + rect.height,
                    height: rect.height,
                    id: 'Social Media'
                });
            }
            
            // Get latest posts section
            const postsSection = document.querySelector('.latest-posts-section');
            if (postsSection) {
                const rect = postsSection.getBoundingClientRect();
                importantSections.push({
                    element: postsSection,
                    top: window.pageYOffset + rect.top,
                    bottom: window.pageYOffset + rect.top + rect.height,
                    height: rect.height,
                    id: 'Blog Posts'
                });
            }
            
            // Get newsletter section
            const newsletterSection = document.querySelector('.newsletter-section');
            if (newsletterSection) {
                const rect = newsletterSection.getBoundingClientRect();
                importantSections.push({
                    element: newsletterSection,
                    top: window.pageYOffset + rect.top,
                    bottom: window.pageYOffset + rect.top + rect.height,
                    height: rect.height,
                    id: 'Newsletter'
                });
            }
            
            // Get footer
            const footer = document.querySelector('footer');
            if (footer) {
                const rect = footer.getBoundingClientRect();
                importantSections.push({
                    element: footer,
                    top: window.pageYOffset + rect.top,
                    bottom: window.pageYOffset + rect.top + rect.height,
                    height: rect.height,
                    id: 'Footer'
                });
            }
            
            // Sort by position
            importantSections.sort((a, b) => a.top - b.top);
            
            console.log('📍 Found', importantSections.length, 'blog sections:', 
                        importantSections.map(s => s.id));
            return;
        }
        
        // Special handling for feedback page
        const isFeedbackPage = window.location.pathname.includes('feedback.html') || 
                              document.querySelector('.feedback-form-container');
        
        if (isFeedbackPage) {
            console.log('💬 Feedback page detected - using special section detection');
            
            // Get header
            const header = document.querySelector('header');
            if (header) {
                const rect = header.getBoundingClientRect();
                importantSections.push({
                    element: header,
                    top: window.pageYOffset + rect.top,
                    bottom: window.pageYOffset + rect.top + rect.height,
                    height: rect.height,
                    id: 'Header'
                });
            }
            
            // Get client feedback carousel section
            const clientFeedback = document.querySelector('.clientfb');
            if (clientFeedback) {
                const rect = clientFeedback.getBoundingClientRect();
                importantSections.push({
                    element: clientFeedback,
                    top: window.pageYOffset + rect.top,
                    bottom: window.pageYOffset + rect.top + rect.height,
                    height: rect.height,
                    id: 'Client Reviews'
                });
            }
            
            // Get feedback form container
            const feedbackForm = document.querySelector('.feedback-form-container');
            if (feedbackForm) {
                const rect = feedbackForm.getBoundingClientRect();
                importantSections.push({
                    element: feedbackForm,
                    top: window.pageYOffset + rect.top,
                    bottom: window.pageYOffset + rect.top + rect.height,
                    height: rect.height,
                    id: 'Feedback Form'
                });
            }
            
            // Get footer
            const footer = document.querySelector('footer');
            if (footer) {
                const rect = footer.getBoundingClientRect();
                importantSections.push({
                    element: footer,
                    top: window.pageYOffset + rect.top,
                    bottom: window.pageYOffset + rect.top + rect.height,
                    height: rect.height,
                    id: 'Footer'
                });
            }
            
            // Sort by position
            importantSections.sort((a, b) => a.top - b.top);
            
            console.log('📍 Found', importantSections.length, 'feedback sections:', 
                        importantSections.map(s => s.id));
            return;
        }
        
        // Default section detection for other pages
        const allElements = [];
        const seenElements = new Set();
        
        SECTION_SELECTORS.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (!seenElements.has(el)) {
                        seenElements.add(el);
                        allElements.push(el);
                    }
                });
            } catch (e) {
                console.warn('Invalid selector:', selector);
            }
        });
        
        // Filter by height and visibility, detect parent-child relationships
        const validElements = [];
        
        allElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const styles = window.getComputedStyle(el);
            
            if (rect.height >= CONFIG.minSectionHeight && 
                styles.display !== 'none' && 
                styles.visibility !== 'hidden' &&
                styles.opacity !== '0') {
                
                const elementTop = window.pageYOffset + rect.top;
                
                validElements.push({
                    element: el,
                    top: elementTop,
                    bottom: elementTop + rect.height,
                    height: rect.height,
                    id: el.id || el.className || el.tagName.toLowerCase()
                });
            }
        });
        
        // Remove nested elements (keep parents if child is too similar)
        const filteredElements = [];
        
        validElements.forEach(section => {
            let isNested = false;
            
            for (const other of validElements) {
                if (section.element !== other.element && 
                    other.element.contains(section.element)) {
                    
                    // Only skip if very similar in size and position
                    const sizeDiff = Math.abs(section.height - other.height);
                    const positionDiff = Math.abs(section.top - other.top);
                    
                    if (sizeDiff < 100 && positionDiff < 50) {
                        isNested = true;
                        break;
                    }
                }
            }
            
            if (!isNested) {
                filteredElements.push(section);
            }
        });
        
        // Sort by position on page
        filteredElements.sort((a, b) => a.top - b.top);
        
        // Remove sections that are too close to each other (keep minimum spacing)
        const finalSections = [];
        let lastTop = -1000;
        
        filteredElements.forEach(section => {
            if (section.top - lastTop > 200) { // At least 200px apart for distinct sections
                finalSections.push(section);
                lastTop = section.top;
            }
        });
        
        importantSections = finalSections;
        
        console.log('📍 Found', importantSections.length, 'important sections:', 
                    importantSections.map(s => s.id));
    }
    
    /**
     * Get current section index based on scroll position
     */
    function getCurrentSectionIndex() {
        const currentScrollPos = window.pageYOffset + CONFIG.scrollOffset;
        
        // Find the section we're currently viewing
        for (let i = importantSections.length - 1; i >= 0; i--) {
            if (currentScrollPos >= importantSections[i].top - 50) {
                return i;
            }
        }
        
        return 0; // At top, return first section
    }
    
    /**
     * Get next section to scroll to (looking forward)
     */
    function getNextSection() {
        const currentIndex = getCurrentSectionIndex();
        const nextIndex = currentIndex + 1;
        
        if (nextIndex < importantSections.length) {
            return nextIndex;
        }
        
        return -1; // Already at last section
    }
    
    /**
     * Get previous section to scroll to (looking backward)
     */
    function getPreviousSection() {
        const currentIndex = getCurrentSectionIndex();
        const prevIndex = currentIndex - 1;
        
        if (prevIndex >= 0) {
            return prevIndex;
        }
        
        return -1; // Already at first section
    }
    
    /**
     * Scroll to specific section
     */
    function scrollToSection(index, offset = CONFIG.scrollOffset) {
        if (index < 0 || index >= importantSections.length) return;
        
        isScrolling = true;
        const section = importantSections[index];
        
        const targetPosition = Math.max(0, section.top - offset);
        
        console.log('📜 Scrolling to section', index + 1, 'of', importantSections.length, 
                    '→', section.id, 'at position', targetPosition);
        
        window.scrollTo({
            top: targetPosition,
            behavior: CONFIG.scrollBehavior
        });
        
        // Reset scrolling flag after animation
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            isScrolling = false;
            lastScrollTime = Date.now();
        }, 800);
    }
    
    /**
     * Scroll to next section
     */
    function scrollDown() {
        // Prevent rapid clicking
        if (Date.now() - lastScrollTime < 300) {
            console.log('⏳ Please wait...');
            return;
        }
        
        const nextIndex = getNextSection();
        
        if (nextIndex !== -1) {
            const currentIndex = getCurrentSectionIndex();
            console.log('⬇️ Scrolling down from section', currentIndex + 1, 'to section', nextIndex + 1, 'of', importantSections.length);
            scrollToSection(nextIndex);
        } else {
            console.log('📍 Already at last section');
        }
    }
    
    /**
     * Scroll to previous section
     */
    function scrollUp() {
        // Prevent rapid clicking
        if (Date.now() - lastScrollTime < 300) {
            console.log('⏳ Please wait...');
            return;
        }
        
        const prevIndex = getPreviousSection();
        
        if (prevIndex !== -1) {
            const currentIndex = getCurrentSectionIndex();
            console.log('⬆️ Scrolling up from section', currentIndex + 1, 'to section', prevIndex + 1, 'of', importantSections.length);
            scrollToSection(prevIndex);
        } else {
            console.log('📍 Already at first section');
        }
    }
    
    /**
     * Update button visibility based on scroll position
     */
    let updateTimeout = null;
    function updateButtonVisibility() {
        // Throttle updates
        if (updateTimeout) return;
        
        updateTimeout = setTimeout(() => {
            const container = document.querySelector('.scroll-nav-container');
            if (!container) {
                updateTimeout = null;
                return;
            }
            
            const scrollPos = window.pageYOffset;
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            
            // Show scroll up button when scrolled down
            if (scrollPos > CONFIG.showScrollUpThreshold) {
                container.classList.add('show-up');
            } else {
                container.classList.remove('show-up');
            }
            
            // Hide scroll down button at bottom
            if (scrollPos >= maxScroll - 50) {
                container.classList.add('hide-down');
            } else {
                container.classList.remove('hide-down');
            }
            
            updateTimeout = null;
        }, CONFIG.throttleDelay);
    }
    
    /**
     * Initialize scroll navigation
     */
    function init() {
        // Wait for page to load completely
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }
        
        // Find important sections after page renders
        setTimeout(() => {
            findImportantSections();
            
            // Re-scan after images load
            if (document.images.length > 0) {
                let loadedImages = 0;
                const totalImages = document.images.length;
                
                Array.from(document.images).forEach(img => {
                    if (img.complete) {
                        loadedImages++;
                    } else {
                        img.addEventListener('load', () => {
                            loadedImages++;
                            if (loadedImages === totalImages) {
                                console.log('🖼️ All images loaded, re-scanning sections');
                                findImportantSections();
                            }
                        });
                    }
                });
                
                // Fallback re-scan after 2 seconds
                setTimeout(() => {
                    if (loadedImages < totalImages) {
                        console.log('🖼️ Timeout reached, re-scanning sections');
                        findImportantSections();
                    }
                }, 2000);
            }
        }, 300);
        
        // Create scroll buttons
        createScrollButtons();
        
        // Update button visibility on scroll (throttled)
        window.addEventListener('scroll', updateButtonVisibility, { passive: true });
        
        // Update sections on window resize (debounced)
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                console.log('📐 Window resized, re-scanning sections');
                findImportantSections();
            }, 500);
        });
        
        // Initial visibility update
        updateButtonVisibility();
        
        console.log('✅ Scroll Navigation initialized');
    }
    
    /**
     * Create scroll navigation buttons
     */
    function createScrollButtons() {
        // Check if buttons already exist
        if (document.querySelector('.scroll-nav-container')) return;
        
        const container = document.createElement('div');
        container.className = 'scroll-nav-container';
        container.innerHTML = `
            <button class="scroll-nav-btn" id="scrollUpBtn" 
                    data-tooltip="Previous section (↑)" 
                    aria-label="Scroll Up"
                    title="Previous section">
                <i class="fas fa-chevron-up"></i>
            </button>
            <button class="scroll-nav-btn" id="scrollDownBtn" 
                    data-tooltip="Next section (↓)" 
                    aria-label="Scroll Down"
                    title="Next section">
                <i class="fas fa-chevron-down"></i>
            </button>
        `;
        
        document.body.appendChild(container);
        
        // Add event listeners
        const upBtn = document.getElementById('scrollUpBtn');
        const downBtn = document.getElementById('scrollDownBtn');
        
        upBtn.addEventListener('click', scrollUp);
        downBtn.addEventListener('click', scrollDown);
        
        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Alt + Up Arrow
            if (e.altKey && e.key === 'ArrowUp') {
                e.preventDefault();
                scrollUp();
            }
            // Alt + Down Arrow
            else if (e.altKey && e.key === 'ArrowDown') {
                e.preventDefault();
                scrollDown();
            }
        });
    }
    
    // Initialize
    init();
    
    // Expose functions globally
    window.scrollNavigation = {
        scrollUp,
        scrollDown,
        refresh: findImportantSections,
        getSections: () => importantSections
    };
    
})();

