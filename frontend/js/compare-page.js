/**
 * Dựng bảng so sánh tour ở compare.html.
 *
 * Mọi phép tính (tour nào tốt nhất ở từng tiêu chí, kết luận đáng tiền nhất,
 * phù hợp nhất với người đang đăng nhập) đều do server làm trong
 * backend/services/compareService.js. Ở đây chỉ hiển thị.
 */
(function () {
  'use strict';

  const escapeHtml = (v) => String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const money = (n) => '$' + Number(n || 0).toLocaleString();

  const dateVi = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

  // Mỗi dòng của bảng: nhãn, cách lấy giá trị, và khoá để biết tour nào thắng.
  const ROWS = [
    { label: 'Giá / người lớn', key: 'price', value: i => money(i.price) },
    { label: 'Số ngày', key: 'days', value: i => i.duration },
    { label: 'Giá mỗi ngày', key: 'pricePerDay', value: i => i.pricePerDay ? money(i.pricePerDay) : '—' },
    { label: 'Đánh giá', key: 'rating', value: i => i.rating ? `${i.rating} ★` : 'Chưa có' },
    { label: 'Lượt đánh giá', key: 'reviewCount', value: i => i.reviewCount },
    { label: 'Độ khó', value: i => i.difficulty || '—' },
    { label: 'Mức vận động', value: i => i.physicalLevel ? `${i.physicalLevel}/5` : '—' },
    { label: 'Nhịp độ', value: i => i.pace || '—' },
    { label: 'Đoàn tối đa', key: 'maxGroupSize', value: i => `${i.maxGroupSize} người` },
    { label: 'Tuổi tối thiểu', value: i => i.minAge > 0 ? `${i.minAge}+` : 'Mọi lứa tuổi' },
    { label: 'Phù hợp với', value: i => (i.suitableFor || []).join(', ') || '—' },
    { label: 'Chủ đề', value: i => (i.themes || []).join(', ') || '—' },
    { label: 'Mùa đẹp nhất', value: i => (i.bestTimeToVisit || []).slice(0, 4).join(', ') || '—' },
    {
      label: 'Hạng khách sạn',
      value: i => (i.hotelTiers || []).length
        ? i.hotelTiers.map(h => `${h.level}★${h.surcharge ? ` (+$${h.surcharge})` : ''}`).join(' · ')
        : '—'
    },
    {
      label: 'Khởi hành gần nhất',
      value: i => i.nextDeparture
        ? `${dateVi(i.nextDeparture.startDate)} — còn ${i.nextDeparture.availableSlots} chỗ`
        : 'Đang cập nhật'
    },
    { label: 'Số mục bao gồm', key: 'inclusionCount', value: i => `${(i.inclusions || []).length} mục` },
    {
      label: 'Chỉ tour này có',
      value: i => (i.uniqueInclusions || []).length
        ? i.uniqueInclusions.slice(0, 3).join(', ')
        : '—'
    }
  ];

  function headerCell(item) {
    return `
      <th class="compare-head">
        <img src="${escapeHtml(item.img)}" alt="${escapeHtml(item.name)}">
        <h3>${escapeHtml(item.name)}</h3>
        <div class="country">${escapeHtml(item.country)}</div>
        <a href="detail.html?id=${escapeHtml(item.id || item._id)}" class="compare-go"
           style="display:inline-block;margin-top:8px;padding:6px 14px;font-size:13px">Xem tour</a>
      </th>`;
  }

  function rowHtml(row, items, best) {
    const winners = row.key ? (best[row.key] || []) : [];
    const cells = items.map(i => {
      const isBest = winners.includes(String(i._id));
      return `<td class="${isBest ? 'best' : ''}">${escapeHtml(row.value(i))}</td>`;
    }).join('');

    return `<tr><th class="row-label">${escapeHtml(row.label)}</th>${cells}</tr>`;
  }

  function verdictHtml(verdict) {
    if (!verdict) return '';
    const cards = [];

    if (verdict.bestValue) {
      cards.push(`
        <div class="verdict-card">
          <h4>💰 Đáng tiền nhất</h4>
          <div class="verdict-name">${escapeHtml(verdict.bestValue.name)}</div>
          <p style="margin:4px 0 0;color:#666">${escapeHtml(verdict.bestValue.reason)}</p>
        </div>`);
    }

    if (verdict.bestForYou) {
      cards.push(`
        <div class="verdict-card">
          <h4>🎯 Phù hợp với bạn nhất — ${verdict.bestForYou.matchPercentage}%</h4>
          <div class="verdict-name">${escapeHtml(verdict.bestForYou.name)}</div>
          <p style="margin:4px 0 0;color:#666">${escapeHtml((verdict.bestForYou.reasons || []).join(' · '))}</p>
        </div>`);
    } else {
      cards.push(`
        <div class="verdict-card" style="border-left-color:#ccc">
          <h4>🎯 Phù hợp với bạn nhất</h4>
          <p style="margin:4px 0 0;color:#666">
            Đăng nhập và cập nhật sở thích để xem tour nào hợp với bạn nhất.
          </p>
        </div>`);
    }

    return cards.join('');
  }

  function empty(message) {
    document.getElementById('compare-content').innerHTML = `
      <div class="compare-empty">
        <i class="fas fa-scale-balanced" style="font-size:40px;color:#ff6600"></i>
        <p style="margin-top:14px">${escapeHtml(message)}</p>
        <a href="destination.html" class="compare-go" style="display:inline-block;margin-top:10px">Chọn tour</a>
      </div>`;
    document.getElementById('compare-verdict').innerHTML = '';
  }

  async function render() {
    const ids = window.CompareBar ? window.CompareBar.read() : [];

    if (ids.length < 2) {
      empty('Hãy chọn ít nhất 2 tour để so sánh. Dùng nút "Compare" ở trang danh sách hoặc trang chi tiết tour.');
      return;
    }

    try {
      const res = await fetch(`/api/tours/compare?ids=${encodeURIComponent(ids.join(','))}`);
      const data = await res.json();

      if (!res.ok || !data.success || (data.items || []).length < 2) {
        empty(data.error || 'Không tải được dữ liệu so sánh.');
        return;
      }

      // Đồng bộ lại tên tour cho thanh so sánh hiển thị đúng.
      data.items.forEach(i => window.CompareBar?.saveName(String(i._id), i.name));
      window.CompareBar?.render();

      document.getElementById('compare-verdict').innerHTML = verdictHtml(data.verdict);
      document.getElementById('compare-content').innerHTML = `
        <table class="compare-table">
          <thead><tr><th class="row-label"></th>${data.items.map(headerCell).join('')}</tr></thead>
          <tbody>${ROWS.map(r => rowHtml(r, data.items, data.best || {})).join('')}</tbody>
        </table>`;
    } catch (err) {
      console.error('Lỗi khi so sánh tour:', err);
      empty('Có lỗi khi tải dữ liệu so sánh. Vui lòng thử lại.');
    }
  }

  document.addEventListener('DOMContentLoaded', render);
  // Bỏ bớt một tour ở thanh dưới thì bảng vẽ lại ngay.
  document.addEventListener('compare:changed', render);
})();
