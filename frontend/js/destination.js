// frontend/js/destination.js
document.addEventListener("DOMContentLoaded", async () => {
  const loaderBox = document.querySelector(".loader-box");
  const loader = document.querySelector(".loader");
  
  // Fetch data from API instead of JSON file
  try {
    const response = await fetch("/api/tours");
    var data = await response.json();
    
    // Track user view for AI recommendations
    const userId = localStorage.getItem('userId');
    if (userId) {
      trackUserViews(userId);
    }
    
  } catch (error) {
    console.log("Error fetching tours:", error);
    // Fallback to local JSON if API fails
    try {
      const fallbackResponse = await fetch("../data/data.json");
      var data = await fallbackResponse.json();
    } catch (fallbackError) {
      console.log("Fallback also failed:", fallbackError);
      data = [];
    }
  }

  const itemsPerPage = 9;
  var currentPage = 1;
  const totalPages = Math.ceil(data.length / itemsPerPage);

  // Create card and display (keep existing logic)
  const displayPage = (data, page) => {
    const container = document.querySelector(".destination");
    container.innerHTML = "";

    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = data.slice(startIndex, endIndex);

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

        // Add AI recommendation badge if available
        if (destination.recommendationScore) {
          const recBadge = document.createElement("span");
          recBadge.classList.add("badge", "badge-success", "ml-2");
          recBadge.textContent = "AI Recommended";
          cardBody.appendChild(recBadge);
        }

        cardBody.appendChild(cardTitle);
        cardBody.appendChild(cardText);
        cardBody.appendChild(cardPrice);
        cardBody.appendChild(cardRate);

        card.appendChild(img);
        card.appendChild(cardBody);
        col.appendChild(card);
        row.appendChild(col);

        // Track view and navigate to detail
        card.addEventListener("click", () => {
          // Sử dụng _id MongoDB hoặc fallback về id string
          const tourId = destination._id || destination.id;
          console.log("Clicking tour with ID:", tourId); // Debug log
          
          trackTourView(tourId);
          // Chuyển đến detail với id
          window.location.href = `detail.html?id=${tourId}`;
        });
      });

      container.appendChild(row);
    }
  };

  // Track tour view for AI
  const trackTourView = async (tourId) => {
    const userId = localStorage.getItem('userId');
    const startTime = Date.now();
    
    setTimeout(async () => {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      
      try {
        await fetch('/api/track/view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, tourId, duration })
        });
      } catch (error) {
        console.log('Error tracking view:', error);
      }
    }, 2000); // Track after 2 seconds
  };

  // Smart search with AI
  const searchInput = document.querySelector(".search-input");
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

  // Load personalized recommendations on page load
  const loadRecommendations = async () => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      try {
        const response = await fetch(`/api/recommendations/${userId}`);
        const recData = await response.json();
        
        if (recData.recommendations && recData.recommendations.length > 0) {
          // Add recommendation section
          const container = document.querySelector(".destination");
          const recSection = document.createElement("div");
          recSection.innerHTML = `
            <div class="row mb-4">
              <div class="col-12">
                <h3 class="text-center mb-4" style="color: #ff6600;">
                  <i class="fas fa-robot"></i> AI Recommendations for You
                </h3>
              </div>
            </div>
          `;
          
          // Show recommended tours
          const recommendedTours = recData.recommendations.slice(0, 3);
          recommendedTours.forEach(rec => {
            const tour = rec.tour;
            if (tour) {
              tour.recommendationScore = rec.score;
              tour.recommendationReason = rec.reason;
            }
          });
          
          container.insertBefore(recSection, container.firstChild);
        }
      } catch (error) {
        console.log('Error loading recommendations:', error);
      }
    }
  };

  // Initialize page
  setTimeout(() => {
    loaderBox.classList.add("d-none");
    loader.classList.add("d-none");
    displayPage(data, 1);
    createPagination(totalPages, data);
    loadRecommendations();
  }, 2000);

  // Keep existing pagination and sorting code...
  const createPagination = (totalPages, data) => {
    const paginationContainer = document.querySelector(".pagination-container");
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

  // Keep existing sorting code...
  // Keep existing sorting code...
const buttonsSort = document.querySelectorAll(".btn-sort");

const lowToHigh = (data) => {
  return data.sort((a, b) => a.estimatedCost - b.estimatedCost);
};
const highToLow = (data) => {
  return data.sort((a, b) => b.estimatedCost - a.estimatedCost);
};
const sortByName = (data) => {
  return data.sort((a, b) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });
};
const sortByRate = (data) => {
  return data.sort((a, b) => b.rating - a.rating);
};

buttonsSort.forEach((button) => {
  button.addEventListener("click", () => {
    buttonsSort.forEach(btn => btn.classList.remove("selected"));
    button.classList.add("selected");

    let sortedData = data;
    const buttonClass = button.classList;

    // Xử lý tất cả các loại sort
    if (buttonClass.contains("low-to-high")) {
      sortedData = lowToHigh([...data]);
      // Ẩn banner AI khi sort khác
      const banner = document.querySelector('.ai-recommend-banner');
      if (banner) {
        banner.classList.remove('visible');
      }
    } else if (buttonClass.contains("high-to-low")) {
      sortedData = highToLow([...data]);
      // Ẩn banner AI khi sort khác
      const banner = document.querySelector('.ai-recommend-banner');
      if (banner) {
        banner.classList.remove('visible');
      }
    } else if (buttonClass.contains("name")) {
      sortedData = sortByName([...data]);
      // Ẩn banner AI khi sort khác
      const banner = document.querySelector('.ai-recommend-banner');
      if (banner) {
        banner.classList.remove('visible');
      }
    } else if (buttonClass.contains("rate")) {
      sortedData = sortByRate([...data]);
      // Ẩn banner AI khi sort khác
      const banner = document.querySelector('.ai-recommend-banner');
      if (banner) {
        banner.classList.remove('visible');
      }
    } else if (buttonClass.contains("reset")) {
      // Reset về data gốc (không sort)
      sortedData = [...data];
      // Ẩn banner AI Recommend khi reset
      const banner = document.querySelector('.ai-recommend-banner');
      if (banner) {
        banner.classList.remove('visible');
      }
    } else if (buttonClass.contains("for-you")) {
      // Xử lý nút For You
      const userId = localStorage.getItem('userId');
      if (userId) {
        // Nếu đã đăng nhập: Hiển thị banner AI Recommend và giữ data hiện tại
        const banner = document.querySelector('.ai-recommend-banner');
        if (banner) {
          banner.classList.add('visible');
        }
        // Giữ data gốc, không sort (tính năng recommend sẽ phát triển sau)
        sortedData = [...data];
      } else {
        // Nếu chưa đăng nhập: chuyển hướng đến trang login
        alert('Vui lòng đăng nhập để sử dụng tính năng này!');
        window.location.href = 'login.html';
        return; // Dừng xử lý
      }
    }

    // Áp dụng sort và hiển thị cho TẤT CẢ các trường hợp
    displayPage(sortedData, 1);
    createPagination(Math.ceil(sortedData.length / itemsPerPage), sortedData);
  });
});

  // Track user views for AI
  const trackUserViews = async (userId) => {
    // Simple view tracking for AI recommendations
    try {
      await fetch('/api/track/page-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, page: 'destination' })
      });
    } catch (error) {
      console.log('Error tracking page view:', error);
    }
  };
});