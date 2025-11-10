document.addEventListener("DOMContentLoaded", async () => {
  console.log("🔍 Destination.js started loading...");
  
  // API Base URL
  const API_BASE_URL = 'http://localhost:3000/api';
  
  const loaderBox = document.querySelector(".loader-box");
  const loader = document.querySelector(".loader");
  
  // Track user views for AI - ĐỊNH NGHĨA FUNCTION TRƯỚC KHI SỬ DỤNG
  const trackUserViews = async (userId) => {
    try {
      await fetch(`${API_BASE_URL}/track/page-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, page: 'destination' })
      });
      console.log("✅ Page view tracked for user:", userId);
    } catch (error) {
      console.log('⚠️ Error tracking page view:', error);
    }
  };

  // Track tour view for AI
  const trackTourView = async (tourId) => {
    const userId = localStorage.getItem('userId');
    const startTime = Date.now();
    
    setTimeout(async () => {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      
      try {
        await fetch(`${API_BASE_URL}/track/view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, tourId, duration })
        });
        console.log("✅ Tour view tracked:", tourId);
      } catch (error) {
        console.log('⚠️ Error tracking view:', error);
      }
    }, 2000); // Track after 2 seconds
  };

  // Function to show development notice
  const showDevelopmentNotice = () => {
    // Create notification modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 2rem;
      border-radius: 10px;
      text-align: center;
      max-width: 400px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    modalContent.innerHTML = `
      <div style="color: #ff6600; font-size: 3rem; margin-bottom: 1rem;">
        <i class="fas fa-cogs"></i>
      </div>
      <h3 style="color: #333; margin-bottom: 1rem;">Feature Under Development</h3>
      <p style="color: #666; margin-bottom: 1.5rem;">
        AI Recommendations will soon be available to suggest the most suitable tours for you!
      </p>
      <button onclick="this.closest('[style*=\"position: fixed\"]').remove()" 
              style="background: #ff6600; color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 5px; cursor: pointer;">
        Got it
      </button>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  };

  // AI Personalized Recommendations Function
  const sortByAIRecommendations = async (tours, button) => {
    const userId = localStorage.getItem('userId');
    
    // Check if user is logged in
    if (!userId) {
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
      `;
      
      const modalContent = document.createElement('div');
      modalContent.style.cssText = `
        background: white;
        padding: 2rem;
        border-radius: 10px;
        text-align: center;
        max-width: 400px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      `;
      
      modalContent.innerHTML = `
        <div style="color: #ff6600; font-size: 3rem; margin-bottom: 1rem;">
          <i class="fas fa-user-lock"></i>
        </div>
        <h3 style="color: #333; margin-bottom: 1rem;">Đăng nhập để nhận gợi ý</h3>
        <p style="color: #666; margin-bottom: 1.5rem;">
          Bạn cần đăng nhập để nhận được gợi ý tour phù hợp từ AI!
        </p>
        <button onclick="window.location.href='login.html'" 
                style="background: #ff6600; color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 5px; cursor: pointer; margin-right: 0.5rem;">
          Đăng nhập
        </button>
        <button onclick="this.closest('[style*=\"position: fixed\"]').remove()" 
                style="background: #ccc; color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 5px; cursor: pointer;">
          Đóng
        </button>
      `;
      
      modal.appendChild(modalContent);
      document.body.appendChild(modal);
      button.classList.remove("selected");
      return;
    }

    // Show loading state
    const loadingToast = document.createElement('div');
    loadingToast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 99999;
      display: flex;
      align-items: center;
      gap: 10px;
    `;
    loadingToast.innerHTML = `
      <i class="fas fa-spinner fa-spin" style="color: #ff6600;"></i>
      <span style="color: #333;">Finding tours perfect for you...</span>
    `;
    document.body.appendChild(loadingToast);

    try {
      // Fetch AI recommendations
      const response = await fetch(`${API_BASE_URL}/recommendations/${userId}`);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const result = await response.json();
      loadingToast.remove();

      if (!result.success || result.recommendations.length === 0) {
        // No recommendations found
        const modal = document.createElement('div');
        modal.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
          background: white;
          padding: 2rem;
          border-radius: 10px;
          text-align: center;
          max-width: 400px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;
        
        modalContent.innerHTML = `
          <div style="color: #ff6600; font-size: 3rem; margin-bottom: 1rem;">
            <i class="fas fa-sliders-h"></i>
          </div>
          <h3 style="color: #333; margin-bottom: 1rem;">Cập nhật sở thích của bạn</h3>
          <p style="color: #666; margin-bottom: 1.5rem;">
            Vui lòng cập nhật sở thích trong trang Profile để nhận gợi ý tour phù hợp!
          </p>
          <button onclick="window.location.href='preferences.html'" 
                  style="background: #ff6600; color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 5px; cursor: pointer; margin-right: 0.5rem;">
            Cập nhật ngay
          </button>
          <button onclick="this.closest('[style*=\"position: fixed\"]').remove()" 
                  style="background: #ccc; color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 5px; cursor: pointer;">
            Đóng
          </button>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        button.classList.remove("selected");
        return;
      }

      // Success toast
      const successToast = document.createElement('div');
      successToast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 99999;
        display: flex;
        align-items: center;
        gap: 10px;
      `;
      successToast.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>Found ${result.count} tours perfect for you!</span>
      `;
      document.body.appendChild(successToast);
      setTimeout(() => successToast.remove(), 3000);

      // Sort tours by match percentage
      const tourIds = result.recommendations.map(r => r.tour._id);
      const recommendedTours = tours.filter(tour => tourIds.includes(tour._id));
      const otherTours = tours.filter(tour => !tourIds.includes(tour._id));

      // Add match data to tours
      recommendedTours.forEach(tour => {
        const rec = result.recommendations.find(r => r.tour._id === tour._id);
        if (rec) {
          tour.aiMatch = {
            percentage: rec.matchPercentage,
            reasons: rec.reasons,
            score: rec.score
          };
        }
      });

      // Sort by match percentage (highest first)
      recommendedTours.sort((a, b) => b.aiMatch.percentage - a.aiMatch.percentage);

      // Combine and display: recommended tours first, then others
      const sortedData = [...recommendedTours, ...otherTours];
      
      // Update global data to maintain sort order
      data.length = 0;
      data.push(...sortedData);
      
      // Display first page with sorted data
      displayPage(sortedData, 1);
      createPagination(Math.ceil(sortedData.length / itemsPerPage), sortedData);
      currentPage = 1;

      console.log("✅ AI Recommendations applied:", result.count, "tours");

    } catch (error) {
      console.error("❌ Error fetching recommendations:", error);
      loadingToast.remove();
      
      // Error toast
      const errorToast = document.createElement('div');
      errorToast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc3545;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 99999;
        display: flex;
        align-items: center;
        gap: 10px;
      `;
      errorToast.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>Unable to load recommendations. Please try again!</span>
      `;
      document.body.appendChild(errorToast);
      setTimeout(() => errorToast.remove(), 3000);
      
      button.classList.remove("selected");
    }
  };

  // Fetch data from API instead of JSON file
  let data = [];
  try {
    console.log("🔍 Fetching tours from API...");
    const response = await fetch("/api/tours");
    console.log("🔍 API Response status:", response.status);
    
    if (response.ok) {
      data = await response.json();
      console.log("✅ Tours loaded from API:", data.length, "tours");
    } else {
      throw new Error(`API returned ${response.status}`);
    }
    
    // Track user view for AI recommendations
    const userId = localStorage.getItem('userId');
    if (userId) {
      console.log("🔍 Tracking user views for:", userId);
      trackUserViews(userId);
    }
    
  } catch (error) {
    console.log("⚠️ Error fetching tours from API:", error);
    // Fallback to local JSON if API fails
    try {
      console.log("🔍 Trying fallback to local JSON...");
      const fallbackResponse = await fetch("../data/data.json");
      data = await fallbackResponse.json();
      console.log("✅ Tours loaded from fallback JSON:", data.length, "tours");
    } catch (fallbackError) {
      console.log("❌ Fallback also failed:", fallbackError);
      data = [];
      alert("Unable to load tour data. Please try again later!");
    }
  }

  if (data.length === 0) {
    console.log("❌ No tour data available");
    if (loaderBox) loaderBox.classList.add("d-none");
    if (loader) loader.classList.add("d-none");
    return;
  }

  const itemsPerPage = 9;
  var currentPage = 1;
  const totalPages = Math.ceil(data.length / itemsPerPage);

  // Create card and display
  const displayPage = (data, page) => {
    console.log("🔍 Displaying page", page, "with", data.length, "total items");
    
    const container = document.querySelector(".destination");
    if (!container) {
      console.error("❌ Container .destination not found!");
      return;
    }
    
    container.innerHTML = "";

    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = data.slice(startIndex, endIndex);
    
    console.log("🔍 Page data:", pageData.length, "items");

    for (let i = 0; i < pageData.length; i += 3) {
      const row = document.createElement("div");
      row.classList.add("row");

      pageData.slice(i, i + 3).forEach((destination) => {
        const col = document.createElement("div");
        col.classList.add("col-md-4");

        const card = document.createElement("div");
        card.classList.add("card");

        const img = document.createElement("img");
        img.src = destination.img;
        img.classList.add("card-img-top");

        const cardBody = document.createElement("div");
        cardBody.classList.add("card-body");

        const cardTitle = document.createElement("h5");
        cardTitle.classList.add("card-title");
        cardTitle.textContent = destination.name;

        const cardText = document.createElement("p");
        cardText.classList.add("card-text");
        cardText.textContent = destination.description;

        const cardPrice = document.createElement("span");
        cardPrice.classList.add("card-price", "mr-2");
        cardPrice.textContent = `${destination.estimatedCost}$`;

        const cardRate = document.createElement("span");
        cardRate.classList.add("card-rate");
        cardRate.innerHTML = `<i class="fa-solid fa-star"></i>${destination.rating}`;

        cardBody.appendChild(cardTitle);
        cardBody.appendChild(cardText);

        // Add AI match badge if available
        if (destination.aiMatch && destination.aiMatch.percentage) {
          const matchContainer = document.createElement("div");
          matchContainer.style.cssText = `
            margin: 0.5rem 0;
            padding: 0.5rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          `;
          
          const matchText = document.createElement("span");
          matchText.style.cssText = `
            color: white;
            font-weight: 600;
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            gap: 5px;
          `;
          matchText.innerHTML = `
            <i class="fas fa-robot"></i>
            ${destination.aiMatch.percentage}% Match
          `;
          
          const infoIcon = document.createElement("i");
          infoIcon.className = "fas fa-info-circle";
          infoIcon.style.cssText = `
            color: white;
            cursor: pointer;
            font-size: 0.9rem;
          `;
          infoIcon.title = destination.aiMatch.reasons.join('\n');
          
          matchContainer.appendChild(matchText);
          matchContainer.appendChild(infoIcon);
          cardBody.appendChild(matchContainer);
        }

        cardBody.appendChild(cardPrice);
        cardBody.appendChild(cardRate);

        card.appendChild(img);
        card.appendChild(cardBody);
        col.appendChild(card);
        row.appendChild(col);

        // Track view and navigate to detail
        card.addEventListener("click", () => {
          const tourId = destination._id || destination.id;
          console.log("🔍 Clicking tour with ID:", tourId);
          
          trackTourView(tourId);
          window.location.href = `detail.html?id=${tourId}`;
        });
      });

      container.appendChild(row);
    }
    
    console.log("✅ Page displayed successfully");
  };

  // Load personalized recommendations on page load
  const loadRecommendations = async () => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      try {
        console.log("🔍 Loading recommendations for user:", userId);
        const response = await fetch(`${API_BASE_URL}/recommendations/${userId}`);
        const recData = await response.json();
        
        if (recData.recommendations && recData.recommendations.length > 0) {
          console.log("✅ Recommendations loaded:", recData.recommendations.length);
          
          // Show recommended tours without header section
          const recommendedTours = recData.recommendations.slice(0, 3);
          recommendedTours.forEach(rec => {
            const tour = rec.tour;
            if (tour) {
              tour.recommendationScore = rec.score;
              tour.recommendationReason = rec.reason;
            }
          });
        }
      } catch (error) {
        console.log('⚠️ Error loading recommendations:', error);
      }
    }
  };

  // Initialize page
  setTimeout(() => {
    console.log("🔍 Initializing page display...");
    if (loaderBox) loaderBox.classList.add("d-none");
    if (loader) loader.classList.add("d-none");
    
    displayPage(data, 1);
    createPagination(totalPages, data);
    
    console.log("✅ Page initialization completed");
  }, 2000);

  // Create pagination
  const createPagination = (totalPages, data) => {
    console.log("🔍 Creating pagination for", totalPages, "pages");
    
    const paginationContainer = document.querySelector(".pagination-container");
    if (!paginationContainer) {
      console.error("❌ Pagination container not found!");
      return;
    }
    
    paginationContainer.innerHTML = "";
    for (let i = 1; i <= totalPages; i++) {
      const pageButton = document.createElement("button");
      pageButton.classList.add("page-button", "btn", "mr-2");
      pageButton.textContent = i;
      if (i == 1) {
        pageButton.classList.add("button-visited");
      }

      pageButton.addEventListener("click", () => {
        pageButton.classList.add("button-visited");

        const listButton = document.querySelectorAll(".page-button");
        listButton.forEach((button) => {
          if (button != pageButton) {
            button.classList.remove("button-visited");
          }
        });

        currentPage = i;
        document.documentElement.scrollTop = 430;
        displayPage(data, currentPage);
      });
      paginationContainer.appendChild(pageButton);
    }
  };

  // Sorting functionality
  const buttonsSort = document.querySelectorAll(".btn-sort");

  const lowToHigh = (data) => {
    return data.sort((a, b) => a.estimatedCost - b.estimatedCost);
  };

  const highToLow = (data) => {
    return data.sort((a, b) => b.estimatedCost - a.estimatedCost);
  };

  const sortByName = (data) => {
    return data.sort((a, b) => a.name.localeCompare(b.name));
  };

  const sortByRate = (data) => {
    return data.sort((a, b) => b.rating - a.rating);
  };

  buttonsSort.forEach((button) => {
    button.addEventListener("click", async () => {
      const buttonClass = button.classList;
      let sortedData;

      // Remove selected class from all buttons first
      buttonsSort.forEach((btn) => btn.classList.remove("selected"));
      button.classList.add("selected");

      if (buttonClass.contains("low-to-high")) {
        sortedData = lowToHigh([...data]);
      } else if (buttonClass.contains("high-to-low")) {
        sortedData = highToLow([...data]);
      } else if (buttonClass.contains("name")) {
        sortedData = sortByName([...data]);
      } else if (buttonClass.contains("rate")) {
        sortedData = sortByRate([...data]);
      } else if (buttonClass.contains("reset")) {
        // Reset về data gốc (không sort)
        sortedData = [...data];
      } else if (buttonClass.contains("for-you")) {
        // AI Personalized Recommendations
        await sortByAIRecommendations(data, button);
        return; // Handle separately with async
      }

      // Áp dụng sort và hiển thị cho TẤT CẢ các trường hợp khác (trừ for-you)
      displayPage(sortedData, 1);
      createPagination(Math.ceil(sortedData.length / itemsPerPage), sortedData);
      
      // Reset current page về 1
      currentPage = 1;
    });
  });

  // Search functionality with debounce
  const searchInput = document.querySelector(".search-input");
  if (searchInput) {
    searchInput.addEventListener("input", debounce(async (e) => {
      const keyword = e.target.value;
      let alertNotFound = document.querySelector(".alert-danger");
      
      if (keyword.length > 2) {
        try {
          const userId = localStorage.getItem('userId');
          const response = await fetch(`/api/search/smart?q=${keyword}&userId=${userId}`);
          const searchData = await response.json();
          
          displayPage(searchData.tours, 1);
          createPagination(Math.ceil(searchData.tours.length / itemsPerPage), searchData.tours);
          
          if (searchData.tours.length === 0) {
            alertNotFound.classList.remove("d-none");
          } else {
            alertNotFound.classList.add("d-none");
          }
        } catch (error) {
          // Fallback to local search
          const regex = new RegExp(keyword, "i");
          let filterData = data.filter(card => regex.test(card.name));
          
          displayPage(filterData, 1);
          createPagination(Math.ceil(filterData.length / itemsPerPage), filterData);
          
          if (filterData.length === 0) {
            alertNotFound.classList.remove("d-none");
          } else {
            alertNotFound.classList.add("d-none");
          }
        }
      } else if (keyword.length === 0) {
        displayPage(data, 1);
        createPagination(totalPages, data);
        alertNotFound.classList.add("d-none");
      }
    }, 300));
  }

  // Debounce function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
});