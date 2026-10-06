/**
 * Thanh so sánh nổi ở đáy màn hình.
 *
 * Trước đây nút Compare ở trang chi tiết chỉ lưu id vào localStorage rồi thôi:
 * không có trang nào hiển thị kết quả, cũng không có lối đi tiếp. Thanh này là
 * phần còn thiếu đó - nó theo người dùng qua mọi trang và dẫn sang compare.html.
 *
 * Nạp file này ở mọi trang có nút Compare.
 */
(function () {
  'use strict';

  const KEY = 'compare';
  const MAX = 4;
  const MIN_TO_COMPARE = 2;

  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  };

  const write = (ids) => {
    try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* bỏ qua */ }
    render();
    document.dispatchEvent(new CustomEvent('compare:changed', { detail: { ids } }));
  };

  const escapeHtml = (v) => String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Tên tour được nhớ lại để thanh hiển thị được ngay mà không cần gọi API.
  const names = (() => {
    try { return JSON.parse(localStorage.getItem('compareNames')) || {}; }
    catch { return {}; }
  })();

  const saveName = (id, name) => {
    names[id] = name;
    try { localStorage.setItem('compareNames', JSON.stringify(names)); } catch { /* bỏ qua */ }
  };

  function toast(message, type) {
    if (typeof showToast === 'function') showToast(type === 'warning' ? 'Notice' : 'Compare', message, type);
    else console.log(message);
  }

  /** Thêm hoặc bỏ một tour khỏi danh sách so sánh. Trả về true nếu đang được chọn. */
  function toggle(tourId, tourName) {
    const ids = read();
    const index = ids.indexOf(tourId);

    if (index >= 0) {
      ids.splice(index, 1);
      write(ids);
      toast('Removed from comparison', 'info');
      return false;
    }

    if (ids.length >= MAX) {
      toast(`You can compare up to ${MAX} tours`, 'warning');
      return false;
    }

    ids.push(tourId);
    if (tourName) saveName(tourId, tourName);
    write(ids);
    toast('Added to comparison', 'success');
    return true;
  }

  function remove(tourId) {
    write(read().filter(id => id !== tourId));
  }

  function clearAll() {
    write([]);
  }

  function render() {
    const ids = read();
    let bar = document.getElementById('compare-bar');

    if (ids.length === 0) {
      if (bar) bar.remove();
      return;
    }

    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'compare-bar';
      document.body.appendChild(bar);
    }

    const chips = ids.map(id => `
      <span class="compare-chip">
        ${escapeHtml(names[id] || 'Tour')}
        <button type="button" class="compare-chip-remove" data-id="${escapeHtml(id)}" title="Remove">&times;</button>
      </span>`).join('');

    const canCompare = ids.length >= MIN_TO_COMPARE;

    bar.innerHTML = `
      <div class="compare-bar-inner">
        <div class="compare-chips">${chips}</div>
        <div class="compare-actions">
          <button type="button" id="compare-clear" class="compare-clear">Clear all</button>
          <a href="compare.html" class="compare-go ${canCompare ? '' : 'disabled'}">
            ${canCompare ? `Compare (${ids.length})` : `Add ${MIN_TO_COMPARE - ids.length} more tour`}
          </a>
        </div>
      </div>`;

    bar.querySelectorAll('.compare-chip-remove').forEach(btn => {
      btn.addEventListener('click', () => remove(btn.dataset.id));
    });
    bar.querySelector('#compare-clear').addEventListener('click', clearAll);

    if (!canCompare) {
      bar.querySelector('.compare-go').addEventListener('click', (e) => e.preventDefault());
    }
  }

  window.CompareBar = { toggle, remove, clearAll, read, saveName, render, MAX };

  document.addEventListener('DOMContentLoaded', render);
})();
