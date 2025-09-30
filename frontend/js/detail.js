// frontend/js/detail.js
document.addEventListener("DOMContentLoaded", async () => {
  document.documentElement.scrollTop = 430;
  
  const urlParams = new URLSearchParams(window.location.search);
  const cardId = urlParams.get("id");
  const travelType = urlParams.get("type"); // Get travel type parameter
  const duration = urlParams.get("duration"); // Get duration parameter

  console.log("Tour ID:", cardId); // Debug log
  console.log("Travel Type:", travelType); // Debug log
  console.log("Duration:", duration); // Debug log

  // Display selected filters if available
  if (travelType || duration) {
    displaySelectedFilters(travelType, duration);
  }

  

  // Get data from API first, fallback to JSON
  try {
    const response = await fetch(`/api/tours/${cardId}`);
    console.log("API Response status:", response.status); // Debug log
    
    if (response.ok) {
      var objectLocation = await response.json();
      console.log("Tour data from API:", objectLocation); // Debug log
    } else {
      throw new Error(`API returned ${response.status}`);
    }
  } catch (error) {
    console.log("API error, using fallback:", error);
    try {
      // Sửa đường dẫn data
      const response = await fetch("../data/data.json");
      const data = await response.json();
      var objectLocation = data.find((obj) => obj.id == cardId);
      console.log("Tour data from JSON:", objectLocation); // Debug log
    } catch (fallbackError) {
      console.log("Fallback also failed:", fallbackError);
      alert("Không thể tải thông tin tour!");
      return;
    }
  }

  if (!objectLocation) {
    console.log("Tour not found with ID:", cardId);
    alert("Tour không tồn tại!");
    window.location.href = "destination.html";
    return;
  }

  // Track view for AI recommendations
  const userId = localStorage.getItem('userId');
  if (userId) {
    trackDetailView(objectLocation._id || objectLocation.id);
  }

  document.title = `${objectLocation.name}`;

  const container = document.querySelector(".container");
  const row = document.querySelector(".row");

  const backBox = document.createElement("div");
  backBox.classList.add("mb-3", "back");
  backBox.innerHTML = `
    <a href="destination.html" class="btn btn-back"><i class="fa-solid fa-arrow-left"></i>Back</a>
  `;

  const col7 = document.createElement("div");
  col7.classList.add("col-7");

  const destinationInfo = document.createElement("div");
  destinationInfo.classList.add("destination-info");

  destinationInfo.innerHTML = `
    <h1>${objectLocation.name}</h1>
    <span class="price">${objectLocation.estimatedCost}$ / Person</span>
    <span class="d-block mt-2 rating"><i class="fa-solid fa-star"></i>${objectLocation.rating}</span>
    <p class="my-4 description">${objectLocation.description}</p>
  `;

  col7.appendChild(destinationInfo);

  // Detail list
  const detailList = document.createElement("ul");
  detailList.classList.add("detail-list", "row");

  const details = [
    {
      label: "Destination",
      value: `${objectLocation.name}, ${objectLocation.country}`,
    },
    { label: "Attractions", value: `${objectLocation.attractions ? objectLocation.attractions.join(", ") : "N/A"}` },
    { label: "Common Foods", value: `${objectLocation.food ? objectLocation.food.join(", ") : "N/A"}` },
    {
      label: "Estimated Cost",
      value: `$${objectLocation.estimatedCost} / 1 Person`,
    },
  ];

  details.forEach((detail) => {
    const li = document.createElement("li");
    li.classList.add("col-12");
    li.innerHTML = `
      <span>${detail.label}:</span>
      <span>${detail.value}</span>
    `;
    detailList.appendChild(li);
  });

  col7.appendChild(detailList);

  // Book button
  const bookButton = document.createElement("a");
  bookButton.href = `reservation.html?tourId=${objectLocation._id || objectLocation.id}`;
  bookButton.classList.add("btn", "btn-book", "mt-4");
  bookButton.textContent = "Book Now";
  col7.appendChild(bookButton);

  // Gallery
  const col5 = document.createElement("div");
  col5.classList.add("col-5");

  const imageZoom = document.createElement("div");
  imageZoom.classList.add("image-zoom");
  
  const mainImage = document.createElement("img");
  mainImage.src = objectLocation.img;
  mainImage.alt = objectLocation.name;
  mainImage.classList.add("light-box");
  
  imageZoom.appendChild(mainImage);
  col5.appendChild(imageZoom);

  // Gallery section
  const gallerySection = document.createElement("div");
  gallerySection.classList.add("gallery", "mt-4");
  gallerySection.innerHTML = `
    <div class="gallery-pictures row"></div>
  `;

  container.appendChild(backBox);
  row.appendChild(col7);
  row.appendChild(col5);
  container.appendChild(row);
  container.appendChild(gallerySection);

  // Function to track detailed view
  const trackDetailView = async (tourId) => {
    const startTime = Date.now();
    
    const trackView = async () => {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      
      try {
        await fetch('/api/track/view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, tourId, duration })
        });
        console.log("View tracked successfully"); // Debug log
      } catch (error) {
        console.log('Error tracking detailed view:', error);
      }
    };

    setTimeout(trackView, 30000);
    window.addEventListener('beforeunload', trackView);
  };

  // Get Library image by using api from unsplash
  const accessKey = "r4tOZXvBx-YGL47ar91HwJIEfL9MqOnzicNl81aaQ-M";
  const query = `${objectLocation.name}`;

  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?page=1&query=${query}&client_id=${accessKey}&per_page=9`
    );
    const data = await response.json();
    const images = data.results;

    const galleryPictures = document.querySelector(".gallery-pictures");
    images.forEach((image, index) => {
      if (index < 9) {
        const colDiv = document.createElement("div");
        colDiv.classList.add("gallery-item", "mb-3");

        const imgElement = document.createElement("img");
        imgElement.src = image.urls.regular;
        imgElement.alt = image.alt_description;
        imgElement.classList.add("gallery-img", "light-box");

        colDiv.appendChild(imgElement);
        galleryPictures.appendChild(colDiv);
      }
    });

    // Lightbox functionality
    const lightboxImages = document.querySelectorAll(".light-box");
    const popup = document.getElementById("popup");
    const popupImg = document.getElementById("popup-img");
    const closeBtn = document.querySelector(".close");

    lightboxImages.forEach((img) => {
      img.addEventListener("click", () => {
        popup.style.display = "block";
        popupImg.src = img.src;
      });
    });

    closeBtn.addEventListener("click", () => {
      popup.style.display = "none";
    });

    window.addEventListener("click", (e) => {
      if (e.target === popup) {
        popup.style.display = "none";
      }
    });
  } catch (error) {
    console.error("Error fetching gallery images:", error);
    // Fallback gallery nếu API Unsplash fail
    const galleryPictures = document.querySelector(".gallery-pictures");
    galleryPictures.innerHTML = `
      <div class="col-12">
        <p>Gallery images temporarily unavailable.</p>
      </div>
    `;
  }
});


