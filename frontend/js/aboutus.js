const viewPackage = document.querySelector(".buttons");
viewPackage.addEventListener("click", () => {
  window.location.href = "destination.html";
});

// Video Slider
const carouselControlNext = document.querySelector(".carousel-control-next");
setInterval(() => {
  carouselControlNext.click();
}, 30000);

// Lấy tất cả các phần tử có class "package"
const packageElements = document.querySelectorAll(".package");

// Duyệt qua từng phần tử và thêm sự kiện click
packageElements.forEach((packageElement) => {
  packageElement.addEventListener("click", () => {
    // Lấy id trực tiếp từ thuộc tính data-id
    const packageId = packageElement.dataset.id;

    // Kiểm tra xem packageId có tồn tại và là một số không
    if (packageId && !isNaN(packageId)) {
      // Chuyển hướng đến trang chi tiết
      const detailUrl = `detail.html?id=${packageId}`;
      window.location.href = detailUrl;
    } else {
      // Xử lý trường hợp không tìm thấy hoặc không hợp lệ (tùy chọn)
      console.error("Invalid package ID:", packageId);
      // Ví dụ: Hiển thị thông báo lỗi cho người dùng
      alert("Đã có lỗi xảy ra. Vui lòng thử lại sau.");
    }
  });
});
