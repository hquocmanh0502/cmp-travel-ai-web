document.addEventListener('DOMContentLoaded', async () => {
  const list = document.getElementById('recent-bookers');
  if (!list) return;

  try {
    const res = await fetch('/api/social-proof/recent-bookers?limit=6');
    if (!res.ok) return;
    const { bookers } = await res.json();
    if (!Array.isArray(bookers) || bookers.length === 0) return;

    bookers.forEach(({ avatar }) => {
      const li = document.createElement('li');
      const img = document.createElement('img');
      img.src = avatar;
      img.alt = '';
      img.loading = 'lazy';
      li.appendChild(img);
      list.appendChild(li);
    });

    // Trailing "+" bubble, same as before
    const more = document.createElement('li');
    const moreImg = document.createElement('img');
    moreImg.src = './images/header/hinhtron.png';
    moreImg.alt = '';
    more.appendChild(moreImg);
    list.appendChild(more);

    list.hidden = false;
  } catch (err) {
    console.error('Failed to load recent bookers:', err);
  }
});
