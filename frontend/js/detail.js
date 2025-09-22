// frontend/js/detail.js
document.addEventListener("DOMContentLoaded", async () => {
  document.documentElement.scrollTop = 430;
  
  const urlParams = new URLSearchParams(window.location.search);
  const cardId = urlParams.get("id");

  // Get data from API first, fallback to JSON
  try {
    const response = await fetch(`/api/tours/${cardId}`);
    if (response.ok) {
      var objectLocation = await response.json();
    } else {
      throw new Error('Tour not found in API');
    }
  } catch (error) {
    console.log("API error, using fallback:", error);
    try {
      const response = await fetch("./data/data.json");
      const data = await response.json();
      var objectLocation = data.find((obj) => obj.id == cardId);
    } catch (fallbackError) {
      console.log("Fallback also failed:", fallbackError);
      alert("Không thể tải thông tin tour!");
      return;
    }
  }

  if (!objectLocation) {
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
    { label: "Attractions", value: `${objectLocation.attractions.join(", ")}` },
    { label: "Common Foods", value: `${objectLocation.food.join(", ")}` },
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
  bookButton.href = `reservation.html?tourId=${objectLocation.id}`;
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
    <h3>Gallery</h3>
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
      `https://api.unsplash.com/search/photos?query=${query}&client_id=${accessKey}&per_page=9`
    );
    const data = await response.json();
    const listImages = data.results;

    const galleryPictures = document.querySelector(".gallery-pictures");

    listImages.forEach((img) => {
      const col4 = document.createElement("div");
      col4.classList.add("col-4", "mb-4");

      const innerImage = document.createElement("div");
      innerImage.classList.add("inner-image");

      const image = document.createElement("img");
      image.classList.add("light-box");
      image.src = `${img.urls.regular}`;

      innerImage.appendChild(image);
      col4.appendChild(innerImage);
      galleryPictures.appendChild(col4);
    });
  } catch (error) {
    console.log("Error fetching gallery images:", error);
  }
});