document.addEventListener('DOMContentLoaded', function() {
    const greetingLi = document.querySelector('.greeting-li');
    const userGreeting = document.querySelector('.user-greeting');

    if (greetingLi && userGreeting) {
        // Toggle dropdown khi click vào greeting
        userGreeting.addEventListener('click', function(e) {
            e.stopPropagation();
            greetingLi.classList.toggle('active');
        });

        // Đóng dropdown khi click ra ngoài
        document.addEventListener('click', function(e) {
            if (!greetingLi.contains(e.target)) {
                greetingLi.classList.remove('active');
            }
        });

        // Ngăn dropdown đóng khi click vào menu items
        const dropdownMenu = greetingLi.querySelector('.user-dropdown-menu');
        if (dropdownMenu) {
            dropdownMenu.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        }
    }
});