/**
 * Liệt kê các chuỗi tiếng Việt còn sót trong code backend có thể hiển thị ra
 * giao diện (website đang dùng tiếng Anh).
 *
 * Chạy: node scripts/list-vi-strings.js
 */

const fs = require('fs');
const path = require('path');

const VIET = /[àáảãạăâđêôơưèéẻẽẹìíịòóỏõọùúủũụỳýỵ]/i;
const DIRS = ['routes', 'services', 'middleware'];

const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js')) files.push(full);
  }
}
DIRS.forEach(d => { if (fs.existsSync(d)) walk(d); });

const found = new Map(); // chuỗi -> danh sách vị trí

for (const file of files) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    // Bỏ qua dòng chú thích - chú thích tiếng Việt là cố ý.
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;

    for (const quote of ['"', "'", '`']) {
      let i = 0;
      while (i < line.length) {
        const start = line.indexOf(quote, i);
        if (start === -1) break;
        const end = line.indexOf(quote, start + 1);
        if (end === -1) break;

        const content = line.slice(start + 1, end);
        if (VIET.test(content)) {
          if (!found.has(content)) found.set(content, []);
          found.get(content).push(`${file}:${idx + 1}`);
        }
        i = end + 1;
      }
    }
  });
}

console.log(`Tổng số chuỗi khác nhau: ${found.size}\n`);
[...found.entries()]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .forEach(([text, locations]) => {
    console.log(`${text}`);
    console.log(`    ${locations.slice(0, 3).join(', ')}${locations.length > 3 ? ` (+${locations.length - 3})` : ''}`);
  });
