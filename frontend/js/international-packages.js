/**
 * Dựng mục "Our International Packages" ở trang About Us từ dữ liệu thật.
 *
 * Trước đây 11 thẻ được viết cứng trong aboutus.html, với giá gõ tay không thống
 * nhất định dạng ("5.000$", "4.500$", "7000$") và không khớp giá trong database.
 * data-id cũng trỏ tới id tour cũ nên có thẻ bấm vào không mở được tour nào.
 *
 * Thẻ đầu tiên giữ class "large" để bố cục lưới không đổi.
 */
(function () {
  'use strict';

  const CONTAINER = '.explore';
  const LIMIT = 11;

  const escapeHtml = (v) => String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function cardHtml(tour, index) {
    const price = tour.pricing?.adult || tour.estimatedCost || 0;
    const tourId = tour.id || tour._id;
    // Thẻ đầu chiếm ô lớn, giống bố cục cũ.
    const size = index === 0 ? 'package large slide-right-delay' : 'package slide-right-delay';

    return `
      <div class="${size}" data-id="${escapeHtml(tourId)}">
        <div class="image">
          <img src="${escapeHtml(tour.img)}" alt="${escapeHtml(tour.name)}">
        </div>
        <div class="info">
          <h2>${escapeHtml(tour.name)}</h2>
          <p>$${price.toLocaleString()}</p>
        </div>
      </div>`;
  }

  async function render() {
    const container = document.querySelector(CONTAINER);
    if (!container) return;

    try {
      const res = await fetch(`/api/tours/featured?limit=${LIMIT}&sort=rating`);
      if (!res.ok) throw new Error(`featured ${res.status}`);

      const data = await res.json();
      const tours = data.tours || [];
      if (tours.length === 0) return;

      container.innerHTML = tours.map(cardHtml).join('');

      container.querySelectorAll('.package').forEach(card => {
        card.addEventListener('click', () => {
          window.location.href = `detail.html?id=${encodeURIComponent(card.dataset.id)}`;
        });
      });
    } catch (err) {
      console.error('Không tải được gói tour quốc tế:', err);
    }
  }

  document.addEventListener('DOMContentLoaded', render);
})();
