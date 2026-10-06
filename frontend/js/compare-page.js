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

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  // Mỗi dòng của bảng: nhãn, cách lấy giá trị, và khoá để biết tour nào thắng.
  const ROWS = [
    { label: 'Price / adult', key: 'price', value: i => money(i.price) },
    { label: 'Duration', key: 'days', value: i => i.duration },
    { label: 'Price per day', key: 'pricePerDay', value: i => i.pricePerDay ? money(i.pricePerDay) : '—' },
    { label: 'Rating', key: 'rating', value: i => i.rating ? `${i.rating} ★` : 'No reviews' },
    { label: 'Reviews', key: 'reviewCount', value: i => i.reviewCount },
    { label: 'Difficulty', value: i => i.difficulty || '—' },
    { label: 'Physical level', value: i => i.physicalLevel ? `${i.physicalLevel}/5` : '—' },
    { label: 'Pace', value: i => i.pace || '—' },
    { label: 'Max group size', key: 'maxGroupSize', value: i => `${i.maxGroupSize} people` },
    { label: 'Minimum age', value: i => i.minAge > 0 ? `${i.minAge}+` : 'All ages' },
    { label: 'Suitable for', value: i => (i.suitableFor || []).join(', ') || '—' },
    { label: 'Themes', value: i => (i.themes || []).join(', ') || '—' },
    { label: 'Best time to visit', value: i => (i.bestTimeToVisit || []).slice(0, 4).join(', ') || '—' },
    {
      label: 'Hotel options',
      value: i => (i.hotelTiers || []).length
        ? i.hotelTiers.map(h => `${h.level}★${h.surcharge ? ` (+$${h.surcharge})` : ''}`).join(' · ')
        : '—'
    },
    {
      label: 'Next departure',
      value: i => i.nextDeparture
        ? `${formatDate(i.nextDeparture.startDate)} — ${i.nextDeparture.availableSlots} seats left`
        : 'To be announced'
    },
    { label: 'Inclusions', key: 'inclusionCount', value: i => `${(i.inclusions || []).length} items` },
    {
      label: 'Only in this tour',
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
           style="display:inline-block;margin-top:8px;padding:6px 14px;font-size:13px">View tour</a>
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
          <h4>💰 Best value</h4>
          <div class="verdict-name">${escapeHtml(verdict.bestValue.name)}</div>
          <p style="margin:4px 0 0;color:#666">${escapeHtml(verdict.bestValue.reason)}</p>
        </div>`);
    }

    if (verdict.bestForYou) {
      cards.push(`
        <div class="verdict-card">
          <h4>🎯 Best match for you — ${verdict.bestForYou.matchPercentage}%</h4>
          <div class="verdict-name">${escapeHtml(verdict.bestForYou.name)}</div>
          <p style="margin:4px 0 0;color:#666">${escapeHtml((verdict.bestForYou.reasons || []).join(' · '))}</p>
        </div>`);
    } else {
      cards.push(`
        <div class="verdict-card" style="border-left-color:#ccc">
          <h4>🎯 Best match for you</h4>
          <p style="margin:4px 0 0;color:#666">
            Sign in and set your travel preferences to see which tour fits you best.
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
        <a href="destination.html" class="compare-go" style="display:inline-block;margin-top:10px">Browse tours</a>
      </div>`;
    document.getElementById('compare-verdict').innerHTML = '';
  }

  async function render() {
    const ids = window.CompareBar ? window.CompareBar.read() : [];

    if (ids.length < 2) {
      empty('Pick at least 2 tours to compare. Use the Compare button on the destination list or a tour detail page.');
      return;
    }

    try {
      const res = await fetch(`/api/tours/compare?ids=${encodeURIComponent(ids.join(','))}`);
      const data = await res.json();

      if (!res.ok || !data.success || (data.items || []).length < 2) {
        empty(data.error || 'Could not load comparison data.');
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
      empty('Something went wrong while loading the comparison. Please try again.');
    }
  }

  document.addEventListener('DOMContentLoaded', render);
  // Bỏ bớt một tour ở thanh dưới thì bảng vẽ lại ngay.
  document.addEventListener('compare:changed', render);
})();
