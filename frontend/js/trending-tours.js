/**
 * Dựng các thẻ "Our Trending Tour Packages" ở trang chủ từ dữ liệu thật.
 *
 * Trước đây 3 thẻ này được viết cứng trong index.html: tên tour, giá, mô tả, số
 * ngày ("8 Days" cho mọi thẻ), số người đi và cả số sao đều là chữ gõ tay. Sau khi
 * dữ liệu tour thay đổi (Paris giờ 7 ngày, điểm đánh giá tính từ 227 review thật)
 * thì các con số đó sai hoàn toàn so với trang chi tiết.
 *
 * Thẻ giờ lấy từ /api/tours/featured, xếp theo lượt đặt rồi tới điểm đánh giá.
 */
(function () {
  'use strict';

  const CONTAINER = '.tour-packages';
  const LIMIT = 3;

  // Mã quốc gia để lấy ảnh cờ. Thư mục images chỉ có sẵn 3 lá cờ nên dùng CDN
  // cho đồng bộ giữa 17 quốc gia.
  const COUNTRY_CODE = {
    France: 'fr', Switzerland: 'ch', Italy: 'it', Japan: 'jp', Thailand: 'th',
    Germany: 'de', Spain: 'es', Greece: 'gr', Portugal: 'pt', Russia: 'ru',
    Canada: 'ca', Netherlands: 'nl', Malaysia: 'my', Maldives: 'mv',
    India: 'in', 'Hong Kong': 'hk', 'United Kingdom': 'gb'
  };

  const escapeHtml = (v) => String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /** Vẽ số sao theo điểm thật, có nửa sao. */
  function starsHtml(rating) {
    const r = Number(rating) || 0;
    const full = Math.floor(r);
    const half = r % 1 >= 0.5;
    let html = '';
    for (let i = 0; i < full; i++) html += '<i class="fa-solid fa-star"></i>';
    if (half) html += '<i class="fa-solid fa-star-half"></i>';
    for (let i = 0; i < 5 - full - (half ? 1 : 0); i++) html += '<i class="fa-regular fa-star"></i>';
    return html;
  }

  function flagHtml(country) {
    const code = COUNTRY_CODE[country];
    if (!code) return '';
    return `<img src="https://flagcdn.com/w40/${code}.png" alt="${escapeHtml(country)} flag">`;
  }

  function cardHtml(tour) {
    const price = tour.pricing?.adult || tour.estimatedCost || 0;
    const bookings = tour.analytics?.bookingCount || 0;
    const tourId = tour.id || tour._id;

    return `
      <div class="tour-card reveal-delay" data-id="${escapeHtml(tourId)}">
        <img src="${escapeHtml(tour.img)}" alt="${escapeHtml(tour.name)}" class="thumbnail">
        <div class="tour-info">
          <div class="tour-header">
            <div class="country-flag">${flagHtml(tour.country)}</div>
            <div class="tour-details">
              <div class="tour-duration">
                <img src="./images/homepage/body/calendar.png" alt="Calendar Icon"> ${escapeHtml(tour.duration)}
              </div>
              <div class="tour-people">
                <img src="./images/homepage/body/people.png" alt="People Icon"> ${bookings} People Going
              </div>
            </div>
          </div>
          <div class="tour-title">
            <h2>${escapeHtml(tour.name)}</h2>
            <div class="rating">${starsHtml(tour.rating)}</div>
          </div>
          <p class="location">
            <img src="./images/homepage/body/location.png" alt="Map Icon"> ${escapeHtml(tour.country)}
          </p>
          <div class="rating-price">
            <span class="price">${price.toLocaleString()}$</span>
          </div>
          <p class="description">${escapeHtml(tour.description)}</p>
          <button type="button">Explore Now</button>
        </div>
      </div>`;
  }

  async function render() {
    const container = document.querySelector(CONTAINER);
    if (!container) return;

    try {
      const res = await fetch(`/api/tours/featured?limit=${LIMIT}`);
      if (!res.ok) throw new Error(`featured ${res.status}`);

      const data = await res.json();
      const tours = data.tours || [];
      if (tours.length === 0) return;

      container.innerHTML = tours.map(cardHtml).join('');

      // Bấm vào thẻ hoặc nút đều mở trang chi tiết đúng tour đó.
      container.querySelectorAll('.tour-card').forEach(card => {
        card.addEventListener('click', () => {
          window.location.href = `detail.html?id=${encodeURIComponent(card.dataset.id)}`;
        });
      });
    } catch (err) {
      console.error('Không tải được tour nổi bật:', err);
      // Giữ nguyên nội dung sẵn có trong HTML thay vì để trống trang.
    }
  }

  document.addEventListener('DOMContentLoaded', render);
})();
