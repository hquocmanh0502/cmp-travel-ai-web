// Smart Tour page: form -> POST /api/smart-tour/plan -> plan cards.
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (v) => '$' + Math.round(v || 0).toLocaleString('en-US');
  const fmtDay = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' });
  const MODE_ICON = { flight: 'fa-plane', train: 'fa-train', bus: 'fa-bus', ferry: 'fa-ship' };
  const FALLBACK_INTERESTS = ['museum', 'history', 'culture', 'architecture', 'food', 'nature',
    'beach', 'island', 'mountain', 'nightlife', 'shopping', 'photography'];

  let maxTours = 3;
  let mustMode = 'all';
  const MAX_MUST = 3;
  const chosen = new Set();
  const must = new Map(); // tourId -> name
  let tourList = [];

  // ---------- form setup ----------
  function isoDay(d) { return d.toISOString().slice(0, 10); }
  function initDates() {
    const from = new Date(Date.now() + 14 * 864e5);
    const to = new Date(from.getTime() + 30 * 864e5);
    $('startFrom').value = isoDay(from);
    $('startTo').value = isoDay(to);
    // Khong chon duoc ngay da qua; server cung chan lai
    const tomorrow = isoDay(new Date(Date.now() + 864e5));
    $('startFrom').min = tomorrow;
    $('startTo').min = tomorrow;
  }

  // ---------- must include ----------
  function renderMustSelect() {
    const groups = {};
    tourList.forEach(t => { (groups[t.country] = groups[t.country] || []).push(t); });
    $('mustSelect').innerHTML = '<option value="">Add a city you must visit…</option>' +
      Object.entries(groups).map(([country, tours]) =>
        `<optgroup label="${esc(country)}">${tours.map(t =>
          `<option value="${esc(t.id)}" ${must.has(t.id) ? 'disabled' : ''}>${esc(t.name)} · ${t.durationDays} days</option>`
        ).join('')}</optgroup>`).join('');
    $('mustSelect').disabled = must.size >= MAX_MUST;
  }

  function renderMust() {
    $('mustList').innerHTML = [...must].map(([id, name]) =>
      `<span class="st-chip">${esc(name)}<button type="button" data-id="${esc(id)}" aria-label="Remove ${esc(name)}"><i class="fas fa-xmark"></i></button></span>`
    ).join('');
    $('mustList').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      must.delete(b.dataset.id);
      renderMust();
    }));
    // "All / At least one" chi co nghia khi chon tu 2 tour tro len
    $('mustModeSeg').hidden = must.size < 2;
    renderMustSelect();
  }

  $('mustSelect').addEventListener('change', () => {
    const id = $('mustSelect').value;
    const tour = tourList.find(t => t.id === id);
    if (tour && must.size < MAX_MUST) must.set(id, tour.name);
    renderMust();
  });

  $('mustModeSeg').querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
    $('mustModeSeg').querySelectorAll('button').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    mustMode = btn.dataset.v;
  }));

  function renderInterests(list) {
    $('interestList').innerHTML = list.map(i =>
      `<button type="button" class="st-chip" data-v="${esc(i)}">${esc(i)}</button>`).join('');
    $('interestList').querySelectorAll('.st-chip').forEach(btn => btn.addEventListener('click', () => {
      btn.classList.toggle('on');
      btn.classList.contains('on') ? chosen.add(btn.dataset.v) : chosen.delete(btn.dataset.v);
    }));
  }

  async function loadOptions() {
    try {
      const res = await fetch('/api/smart-tour/options');
      const data = await res.json();
      renderInterests(data.interests || FALLBACK_INTERESTS);
      tourList = data.tours || [];
      renderMustSelect();
    } catch {
      renderInterests(FALLBACK_INTERESTS);
    }
  }

  function addChild(age = 6) {
    const wrap = document.createElement('div');
    wrap.className = 'st-child';
    wrap.innerHTML = `<i class="fas fa-child"></i><input type="number" min="0" max="17" value="${age}" aria-label="Child age">
      <button type="button" aria-label="Remove"><i class="fas fa-xmark"></i></button>`;
    wrap.querySelector('button').addEventListener('click', () => wrap.remove());
    $('childList').appendChild(wrap);
  }

  $('maxToursSeg').querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
    $('maxToursSeg').querySelectorAll('button').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    maxTours = Number(btn.dataset.v);
  }));
  $('addChild').addEventListener('click', () => addChild());

  function readForm() {
    return {
      startFrom: $('startFrom').value,
      startTo: $('startTo').value,
      days: Number($('days').value),
      budget: Number($('budget').value),
      adults: Number($('adults').value),
      childAges: [...$('childList').querySelectorAll('input')].map(i => Number(i.value)),
      travelParty: $('travelParty').value || undefined,
      interests: [...chosen],
      pace: $('pace').value,
      maxPhysical: Number($('maxPhysical').value),
      maxTours,
      mustInclude: [...must.keys()],
      mustMode
    };
  }

  // ---------- results ----------
  function stopHtml(s) {
    const link = `detail.html?id=${encodeURIComponent(s.tourId)}&departure=${s.startDay}`;
    return `<div class="st-stop">
      <img src="${esc(s.img)}" alt="${esc(s.name)}" loading="lazy">
      <div>
        <div class="st-stop-name">${esc(s.name)}, ${esc(s.country)}</div>
        <div class="st-stop-meta">${fmtDay(s.startDay)} – ${fmtDay(s.endDay)} · ${s.durationDays} days · ${esc(s.pace)} · level ${s.physicalLevel}</div>
        <div class="st-stop-meta"><i class="fas fa-hotel"></i> ${esc(s.hotel || 'Standard hotel')} · ${s.availableSlots} seats left</div>
      </div>
      <div class="st-stop-price">
        <span class="st-season ${esc(s.season)}">${esc(s.season)}</span><br>
        <b>${money(s.cost)}</b><br>
        <a href="${link}">View &amp; book <i class="fas fa-arrow-right"></i></a>
      </div>
    </div>`;
  }

  function connHtml(c) {
    const hours = Math.floor(c.travelMinutes / 60);
    const mins = c.travelMinutes % 60;
    const night = c.connectionNights
      ? `<span class="night">+${c.connectionNights} night in ${esc(c.to)} (${money(c.nightsCost)})</span>`
      : 'tour starts the same day';
    return `<div class="st-conn">
      <i class="fas ${MODE_ICON[c.mode] || 'fa-route'}"></i>
      ${esc(c.mode)}${c.stops ? ` (${c.stops} stop)` : ''} · ${c.distanceKm.toLocaleString('en-US')} km ·
      door to door ${hours}h${mins ? ` ${mins}m` : ''} · ${money(c.transportCost)}<br>
      Leave ${esc(c.from)} ${fmtDay(c.leaveDay)} ${esc(c.leaveAt)} → arrive ${esc(c.to)} ${fmtDay(c.arriveDay)} ${esc(c.arriveAt)} (local) · ${night}
    </div>`;
  }

  function planHtml(p, i) {
    const route = p.stops.map(s => esc(s.name)).join(' → ');
    const parts = [];
    p.stops.forEach((s, k) => {
      parts.push(stopHtml(s));
      if (p.connections[k]) parts.push(connHtml(p.connections[k]));
    });
    const bars = Object.entries(p.breakdown).map(([k, v]) =>
      `<div class="st-bar"><div><span style="width:${v}%"></span></div>${esc(k)}</div>`).join('');
    return `<article class="st-plan">
      <div class="st-plan-head">
        <div>
          <div class="st-plan-title">
            <span class="st-badge ${p.level === 'A' ? 'a' : 'b'}">${p.level === 'A' ? 'Single tour' : `${p.stops.length}-city combo`}</span>
            #${i + 1} ${route}
          </div>
          <div class="st-plan-sub">${fmtDay(p.startDay)} – ${fmtDay(p.endDay)} · ${p.totalDays} days ·
            <span class="st-price">${money(p.costPerPerson)}/person</span> (${money(p.totalCost)} total)</div>
        </div>
        <div class="st-score"><b>${p.score}</b><span>match score</span></div>
      </div>
      <div class="st-timeline">${parts.join('')}</div>
      <div class="st-why">
        <ul class="pos">${p.reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
        <ul class="neg">${p.warnings.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
      </div>
      <div class="st-bars">${bars}</div>
    </article>`;
  }

  function render(data) {
    const c = data.counts;
    const n = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
    const mustPart = c.withMustInclude != null ? ` · ${c.withMustInclude} with your must-visit` : '';
    $('stSummary').textContent = data.plans.length
      ? `Checked ${n(c.candidates, 'possible trip')}${mustPart} · ${c.withinBudget} within budget ` +
        `(${n(c.levelA, 'single tour')}, ${n(c.levelB, 'combo')}). Best ${data.plans.length}:`
      : '';
    let html = '';
    // Nhung gi server tu dieu chinh (ngay da qua, tre 12+ tinh nguoi lon...)
    if (data.notes?.length) html += `<div class="st-notes"><i class="fas fa-circle-info"></i> ${data.notes.map(esc).join('<br>')}</div>`;
    if (data.tips?.length) html += `<div class="st-tips">${data.tips.map(esc).join('<br>')}</div>`;
    if (data.plans.length) html += data.plans.map(planHtml).join('');
    else if (data.closest?.length) html += '<h3 class="st-plan-sub">Closest option:</h3>' + data.closest.map(planHtml).join('');
    $('stPlans').innerHTML = html || '<div class="st-empty"><i class="fas fa-circle-exclamation"></i><p>No trip found.</p></div>';
  }

  $('stForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('stSubmit');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Planning…';
    try {
      const res = await fetch('/api/smart-tour/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(readForm())
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Request failed');
      render(data);
      $('stSummary').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      $('stSummary').textContent = '';
      $('stPlans').innerHTML = `<div class="st-tips">${esc(err.message)}</div>`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Find my trip';
    }
  });

  initDates();
  loadOptions();
})();
