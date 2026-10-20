# Điểm tham quan (POI) cho 36 tour

`wikidata-pois.json`: 1.347 điểm tham quan, lấy từ **Wikidata** (lần cuối 2026-10-19).

| | |
|---|---|
| Giấy phép | **CC0 1.0**, được lưu và phân phối lại tự do (vì vậy file này được commit, khác với `data/external/`) |
| Tải lại | `node scripts/fetch-wikidata-pois.js` (từ thư mục `backend`) |
| Nạp vào DB | `node scripts/import-pois.js`, ghi vào collection `pois` |
| Kiểm tra | `node scripts/verify-data-quality.js`, mục 7b |

## Cách chọn điểm (giống nhau cho cả 36 thành phố)

1. Mọi mục Wikidata trong bán kính 20 km quanh tọa độ tour, cùng quốc gia, còn hoạt động, có ≥ 2 sitelinks.
2. Chỉ giữ những gì thuộc một loại trong [`config/poi-categories.js`](../../backend/config/poi-categories.js): bảo tàng, cung điện, công trình tôn giáo, công viên, bãi biển, núi...
3. Xếp theo **sitelinks** giảm dần. Sitelinks là số phiên bản Wikipedia/Wikivoyage có bài về điểm đó, dùng làm thước đo độ nổi tiếng.
4. Mỗi loại điểm được **giữ chỗ cho 2 điểm nổi tiếng nhất của loại đó** trước, rồi mới lấp phần còn lại theo sitelinks. Có giới hạn số điểm mỗi loại (ví dụ tối đa 1 sân vận động), tối đa 40 điểm mỗi thành phố.
   Nếu không giữ chỗ, bảo tàng và nhà thờ chiếm hết suất, khiến khách chọn "Beach" hoặc "Food" không nhận được điểm nào.
5. Bỏ:
   - chính điểm đến (đảo "Phuket") và mục trùng tên;
   - công trình đã phá huỷ, tàu đắm, tác phẩm đã thất lạc (tượng Athena Parthenos);
   - hiện vật thuộc bộ sưu tập của nơi khác (Venus de Milo nằm trong Louvre);
   - đơn vị **thuần hành chính** như "1st arrondissement of Paris", "Kita-ku" (Osaka). Pháo đài, lâu đài, tháp vẫn được giữ, dù Wikidata cũng xếp chúng vào nhóm hành chính.

`visitMinutes` (thời gian tham quan) **không có trên Wikidata**, nên được gán theo loại bằng một bảng cố định trong `poi-categories.js`. Đây là ước lượng, không phải số đo.

## Loại điểm phục vụ sở thích "Food", "Nightlife", "Shopping"

Thêm ngày 2026-10-19: **market** (chợ, chợ ẩm thực, chợ đêm), **eatery** (nhà hàng, quán cà phê, khu ẩm thực), **nightlife** (bar, pub, hộp đêm, khu giải trí). Nhóm **shopping** được mở rộng sang phố mua sắm và khu mua sắm.

## Bổ sung từ OpenStreetMap (`osm-pois.json`)

Wikidata gần như không có bãi biển, quán bar, điểm ngắm cảnh ở các đảo nhỏ: Maldives có 0 bãi biển, Phuket có 0 quán bar. Hạ ngưỡng xuống 1 sitelink cũng chỉ ra thêm mũi đất và đảo không tên.

| | |
|---|---|
| Giấy phép | **ODbL 1.0**, © OpenStreetMap contributors. Phải ghi nguồn nếu hiển thị |
| Tải lại | `node scripts/fetch-osm-pois.js` (chạy lại được, chỉ hỏi những chủ đề chưa lấy được) |
| Nạp vào DB | `node scripts/import-pois.js` nạp cả hai file. Điểm OSM xếp **sau** mọi điểm Wikidata |

**Luật (giống nhau cho cả 36 tour):** nếu một chủ đề trong `Tour.themes` có dưới 2 điểm Wikidata làm bằng chứng, script lấy thêm tối đa 2 điểm OSM đúng loại của chủ đề đó. Ví dụ beach → `natural=beach`, nightlife → `amenity=bar|pub|nightclub`, photography → `tourism=viewpoint`, island → `place=island`.
Luật chỉ áp cho chủ đề mà tour **tự nhận**. Vì vậy Berlin không bị gắn thêm "beach" chỉ vì có bãi tắm ven hồ.

Cách xếp hạng (OSM không có sitelinks): có thẻ wikidata, rồi có bài wikipedia, rồi có tên tiếng Anh, rồi nhiều thẻ mô tả hơn, rồi gần trung tâm hơn.

Overpass hay trả lỗi 502/504 hoặc hết thời gian chờ nếu một truy vấn hỏi nhiều thẻ cùng lúc. Vì vậy script hỏi **mỗi lần một thẻ** và lưu kết quả sau từng chủ đề.

## Giới hạn đã biết

- Trước khi bổ sung OSM, có 5 trường hợp sở thích thiếu điểm minh hoạ: Maldives (beach), Phuket (nightlife), Santorini (beach, photography), Langkawi (island). Xem phần bổ sung OSM ở trên.

- Langkawi (14), Maldives (15), Phuket (21), Santorini (24) có ít điểm hơn hẳn các thành phố khác (34–40). Các nơi này là điểm đến nghỉ dưỡng biển, ít điểm tham quan có bài Wikipedia. Tất cả vẫn đạt mức tối thiểu 2 điểm cho mỗi ngày tour.
- Luật "thuần hành chính" loại nhầm **Mürren** (Lauterbrunnen), vì Wikidata xếp mọi loại của nó vào nhóm hành chính.
- Cuối danh sách của điểm đến nhỏ có vài điểm kém hấp dẫn, ví dụ làng nhỏ quanh Lauterbrunnen hay đảo Thilafushi (Maldives). Những điểm này không bị lọc tay để giữ nguyên tắc cùng một luật cho mọi nơi. Chúng đứng hạng thấp nên ít được chọn khi xếp lịch.
