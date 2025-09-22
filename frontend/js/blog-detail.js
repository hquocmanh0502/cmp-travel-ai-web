window.addEventListener("DOMContentLoaded", async () => {
  //Get id from url
  const urlParams = new URLSearchParams(window.location.search);
  const blogId = urlParams.get("id");

  try {
    const response = await fetch("../data/blog.json");
    var data = await response.json();
  } catch (error) {
    console.log(error);
  }

  var objectBlog = data.find((obj) => obj.id == blogId);
  const downTitle = document.querySelector("#down-title")

  const blogTitle = document.querySelector(".blog-title")

  const blogDescription = document.querySelector(".blog-description")
  const geography = document.querySelector("#geography")
  const climate = document.querySelector("#climate")
  const language = document.querySelector("#language")
  const culture = document.querySelector("#culture")

  const geographyImage = document.querySelector("#geography-img")
  const climateImage = document.querySelector("#climate-img")
  const cultureImage = document.querySelector("#culture-img")

  // console.log(objectBlog.images[0])

  if(objectBlog){
    const locationName = objectBlog.title.split(" - ")[0]
    document.title = locationName

    downTitle.textContent = `${locationName} Blog`
    blogTitle.textContent = `${objectBlog.title}`
    blogDescription.textContent = `${objectBlog.description}`
    geography.textContent = `${objectBlog.geography}`
    climate.textContent = `${objectBlog.climate}`
    language.textContent = `${objectBlog.language}`
    culture.textContent = `${objectBlog.people}`

    geographyImage.src = `${objectBlog.images[0]}`
    climateImage.src = `${objectBlog.images[1]}`
    cultureImage.src = `${objectBlog.images[2]}`
  }

});
