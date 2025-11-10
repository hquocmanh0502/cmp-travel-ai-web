/**
 * Gallery Lightbox with Prev/Next Navigation
 */

(function() {
    'use strict';
    
    let currentImageIndex = 0;
    let allImages = [];
    
    // Create modal HTML structure
    function createLightboxModal() {
        const modal = document.createElement('div');
        modal.id = 'lightbox-modal';
        modal.className = 'lightbox-modal';
        modal.innerHTML = `
            <div class="lightbox-overlay"></div>
            <div class="lightbox-content">
                <button class="lightbox-close" aria-label="Close">
                    <i class="fas fa-times"></i>
                </button>
                <button class="lightbox-prev" aria-label="Previous">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <button class="lightbox-next" aria-label="Next">
                    <i class="fas fa-chevron-right"></i>
                </button>
                <div class="lightbox-image-wrapper">
                    <img src="" alt="" class="lightbox-image">
                    <div class="lightbox-caption"></div>
                    <div class="lightbox-counter"></div>
                </div>
                <div class="lightbox-loader">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        return modal;
    }
    
    // Initialize lightbox
    function initLightbox() {
        // Get all gallery images
        allImages = Array.from(document.querySelectorAll('.light-box'));
        
        if (allImages.length === 0) {
            console.log('📸 No gallery images found');
            return;
        }
        
        console.log(`📸 Gallery Lightbox initialized with ${allImages.length} images`);
        
        // Create modal
        const modal = createLightboxModal();
        const overlay = modal.querySelector('.lightbox-overlay');
        const closeBtn = modal.querySelector('.lightbox-close');
        const prevBtn = modal.querySelector('.lightbox-prev');
        const nextBtn = modal.querySelector('.lightbox-next');
        const img = modal.querySelector('.lightbox-image');
        const caption = modal.querySelector('.lightbox-caption');
        const counter = modal.querySelector('.lightbox-counter');
        const loader = modal.querySelector('.lightbox-loader');
        
        // Add click handlers to all images
        allImages.forEach((image, index) => {
            image.style.cursor = 'pointer';
            image.addEventListener('click', function() {
                openLightbox(index);
            });
        });
        
        // Open lightbox
        function openLightbox(index) {
            currentImageIndex = index;
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            loadImage();
        }
        
        // Close lightbox
        function closeLightbox() {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
        
        // Load current image
        function loadImage() {
            const currentImage = allImages[currentImageIndex];
            const imageSrc = currentImage.src;
            const imageCaption = currentImage.getAttribute('data-caption') || '';
            
            // Show loader
            loader.style.display = 'flex';
            img.style.opacity = '0';
            
            // Load image
            const tempImg = new Image();
            tempImg.onload = function() {
                img.src = imageSrc;
                img.alt = imageCaption;
                caption.textContent = imageCaption;
                counter.textContent = `${currentImageIndex + 1} / ${allImages.length}`;
                
                // Hide loader, show image
                setTimeout(() => {
                    loader.style.display = 'none';
                    img.style.opacity = '1';
                }, 200);
            };
            tempImg.src = imageSrc;
            
            // Update button states
            prevBtn.style.opacity = currentImageIndex === 0 ? '0.3' : '1';
            prevBtn.style.cursor = currentImageIndex === 0 ? 'not-allowed' : 'pointer';
            nextBtn.style.opacity = currentImageIndex === allImages.length - 1 ? '0.3' : '1';
            nextBtn.style.cursor = currentImageIndex === allImages.length - 1 ? 'not-allowed' : 'pointer';
        }
        
        // Navigate to previous image
        function showPrevious() {
            if (currentImageIndex > 0) {
                currentImageIndex--;
                loadImage();
            }
        }
        
        // Navigate to next image
        function showNext() {
            if (currentImageIndex < allImages.length - 1) {
                currentImageIndex++;
                loadImage();
            }
        }
        
        // Event listeners
        closeBtn.addEventListener('click', closeLightbox);
        overlay.addEventListener('click', closeLightbox);
        prevBtn.addEventListener('click', showPrevious);
        nextBtn.addEventListener('click', showNext);
        
        // Keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (!modal.classList.contains('active')) return;
            
            switch(e.key) {
                case 'Escape':
                    closeLightbox();
                    break;
                case 'ArrowLeft':
                    showPrevious();
                    break;
                case 'ArrowRight':
                    showNext();
                    break;
            }
        });
        
        // Touch swipe support for mobile
        let touchStartX = 0;
        let touchEndX = 0;
        
        img.addEventListener('touchstart', function(e) {
            touchStartX = e.changedTouches[0].screenX;
        });
        
        img.addEventListener('touchend', function(e) {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        });
        
        function handleSwipe() {
            const swipeThreshold = 50;
            const diff = touchStartX - touchEndX;
            
            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) {
                    // Swipe left - next image
                    showNext();
                } else {
                    // Swipe right - previous image
                    showPrevious();
                }
            }
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLightbox);
    } else {
        initLightbox();
    }
})();
