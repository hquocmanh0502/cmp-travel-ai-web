// scroll viewpackage
function scrollToTargetPosition(targetY) {
    // Kiểm tra xem targetY có phải là một số hợp lệ hay không
    if (typeof targetY !== 'number') {
      return;
    }
  
    window.scrollTo({
      top: targetY,
      behavior: 'smooth'
    });
  }
  
  const viewPackageButton = document.querySelector('.nutview');
  const viewPackageButton8 = document.querySelector('.iconmove');
  const viewPackageButton1 = document.getElementById('nutview1');
  const viewPackageButton2 = document.getElementById('nutview2');
  const viewPackageButton3 = document.getElementById('nutview3');
  const viewPackageButton4 = document.getElementById('nutview4');
  const viewPackageButton5 = document.getElementById('nutview5');
  const viewPackageButton6 = document.getElementById('nutview6');
  const viewPackageButton7 = document.getElementById('nutview7');


  
  // Gọi hàm scrollToTargetPosition với tọa độ y mong muốn khi nhấp nút
  viewPackageButton.addEventListener('click', () => {
    scrollToTargetPosition(2540); // Thay thế 'yourTargetY' bằng tọa độ y thực tế
  });
  viewPackageButton1.addEventListener('click', () => {
    scrollToTargetPosition(3240); // Thay thế 'yourTargetY' bằng tọa độ y thực tế
  });
  viewPackageButton2.addEventListener('click', () => {
    scrollToTargetPosition(4240); // Thay thế 'yourTargetY' bằng tọa độ y thực tế
  });
  viewPackageButton3.addEventListener('click', () => {
    scrollToTargetPosition(5240); // Thay thế 'yourTargetY' bằng tọa độ y thực tế
  });
  viewPackageButton4.addEventListener('click', () => {
    scrollToTargetPosition(6240); // Thay thế 'yourTargetY' bằng tọa độ y thực tế
  });
  viewPackageButton5.addEventListener('click', () => {
    scrollToTargetPosition(7210); // Thay thế 'yourTargetY' bằng tọa độ y thực tế
  });
  viewPackageButton6.addEventListener('click', () => {
    scrollToTargetPosition(8210); // Thay thế 'yourTargetY' bằng tọa độ y thực tế
  });
  viewPackageButton7.addEventListener('click', () => {
    scrollToTargetPosition(9210); // Thay thế 'yourTargetY' bằng tọa độ y thực tế
  });

  // lam icon bien mat khi keo qua vi tri
  const targetY = 2670; // Vị trí Y mục tiêu (thay đổi giá trị này)

const iconElement = document.querySelector('.iconmove'); // Chọn icon bằng class

const slider = document.querySelector('.slider');
const slides = slider.querySelectorAll('.slide');
const dots = document.querySelector('.dots').querySelectorAll('a');

let currentSlideIndex = 0;
let isAnimating = false;

// Hàm chuyển đến slide tiếp theo
function moveToNextSlide() {
  currentSlideIndex = (currentSlideIndex + 1) % slides.length;
  slider.scrollTo({ left: currentSlideIndex * slider.offsetWidth, behavior: 'smooth', // Adjust as needed
    duration: 700 });
  updateDots();
}

// Hàm cập nhật trạng thái của các chấm tròn
function updateDots() {
  dots.forEach((dot, index) => {
    dot.classList.remove('active');
    if (index === currentSlideIndex) {
      dot.classList.add('active');
    }
  });
}

// Bắt đầu slide đầu tiên (tùy chọn)
moveToNextSlide();

// Thiết lập tự động phát (điều chỉnh khoảng thời gian theo nhu cầu)
setInterval(moveToNextSlide, 3000); // Chuyển slide sau mỗi 3 giây
  





  


