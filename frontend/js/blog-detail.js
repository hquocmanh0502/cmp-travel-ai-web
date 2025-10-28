window.addEventListener("DOMContentLoaded", async () => {
  // Get id from url
  const urlParams = new URLSearchParams(window.location.search);
  const blogId = urlParams.get("id");

  let objectBlog;

  try {
    // Thử fetch từ API trước
    const response = await fetch(`/api/blogs/${blogId}`);
    if (response.ok) {
      objectBlog = await response.json();
      console.log("Blog data from API:", objectBlog);
    } else {
      throw new Error(`API returned ${response.status}`);
    }
  } catch (err) {
      console.error(err);
      alert("Unable to load blog information!");
    }

  // Kiểm tra xem blog có tồn tại không
  if (!objectBlog) {
    console.log("Blog not found with ID:", blogId);
    } else {
    alert("Blog does not exist!");
    window.location.href = "./blog.html";
  }
    return;
  }

  const downTitle = document.querySelector("#down-title");
  const blogTitle = document.querySelector(".blog-title");
  const blogDescription = document.querySelector(".blog-description");
  const geography = document.querySelector("#geography");
  const climate = document.querySelector("#climate");
  const language = document.querySelector("#language");
  const culture = document.querySelector("#culture");

  const geographyImage = document.querySelector("#geography-img");
  const climateImage = document.querySelector("#climate-img");
  const cultureImage = document.querySelector("#culture-img");

  // Hiển thị thông tin blog
  const locationName = objectBlog.title.split(" - ")[0];
  document.title = locationName;
  
  downTitle.textContent = `${locationName} Blog`;
  blogTitle.textContent = objectBlog.title;
  blogDescription.textContent = objectBlog.description;
  geography.textContent = objectBlog.geography;
  climate.textContent = objectBlog.climate;
  language.textContent = objectBlog.language;
  culture.textContent = objectBlog.people;

  // Hiển thị hình ảnh nếu có
  if (objectBlog.images && objectBlog.images.length > 0) {
    geographyImage.src = objectBlog.images[0] || '';
    climateImage.src = objectBlog.images[1] || objectBlog.images[0] || '';
    cultureImage.src = objectBlog.images[2] || objectBlog.images[0] || '';
  }
});