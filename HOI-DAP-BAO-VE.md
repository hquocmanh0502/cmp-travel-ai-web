# Hỏi – đáp chi tiết khi bảo vệ: Smart Tour + Chatbot (CMP Travel)

> Mỗi câu có **câu trả lời ngắn** (nói trước), **chi tiết** (nếu thầy hỏi sâu) và nơi trong code để mở ra chỉ nếu cần.
> Mọi công thức và con số dưới đây lấy đúng từ code và dữ liệu hiện tại (kiểm tra ngày 19/11/2026).

**Mục lục**
1. [Smart Tour: thuật toán ghép tour](#1-smart-tour-thuật-toán-ghép-tour)
2. [Smart Tour: chấm điểm (có ví dụ tính tay)](#2-smart-tour-chấm-điểm-có-ví-dụ-tính-tay)
3. [Dữ liệu: Wikidata, OpenStreetMap, thời tiết, chặng bay](#3-dữ-liệu-wikidata-openstreetmap-thời-tiết-chặng-bay)
4. [Giá, đặt tour, hoàn tiền](#4-giá-đặt-tour-hoàn-tiền)
5. [Chatbot](#5-chatbot)
6. [Dashboard admin](#6-dashboard-admin)
7. [Câu hỏi "bẫy" và giới hạn của đồ án](#7-câu-hỏi-bẫy-và-giới-hạn-của-đồ-án)

---

## 1. Smart Tour: thuật toán ghép tour

### 1.1 "Smart Tour làm gì khác bộ lọc tour thông thường?"

**Ngắn:** bộ lọc chỉ trả về **từng tour riêng lẻ**. Smart Tour **ghép 2–3 tour nối tiếp nhau** thành một chuyến đi, dựa trên lịch khởi hành thật, giờ di chuyển thật và múi giờ, rồi xếp hạng bằng điểm có giải thích.

**Chi tiết:** có 2 mức:
- **Level A:** 1 tour nguyên vẹn (tour từ 3 ngày trở lên).
- **Level B:** 2–3 tour nguyên vẹn nối tiếp nhau. Không cắt ngày của tour nào; chặng nối giữa hai tour được tính giờ và giá.

📂 `backend/services/smartTourService.js` (hàm `buildPlans`, `planConnection`, `scorePlan`)

### 1.2 "Thuật toán tìm chuyến ghép như thế nào?"

**Ngắn:** duyệt theo chiều sâu (DFS), **cắt nhánh sớm** theo ràng buộc: bắt đầu từ mỗi chuyến khởi hành nằm trong khoảng ngày khách chọn, rồi thử nối từng tour khác.

**Chi tiết:**
```
Với mỗi tour A (qua lọc an toàn) × mỗi chuyến khởi hành của A trong khoảng ngày, còn đủ ghế:
   → ghi nhận kế hoạch [A]
   → với mỗi tour B chưa có trong chuyến:
        tính chặng nối A→B (giờ trả phòng, ra sân bay, bay, múi giờ)
        → ngày sớm nhất B bắt đầu được
        → B phải có chuyến khởi hành đúng ngày đó, hoặc trễ tối đa 1 ngày (MAX_WAIT_DAYS = 1)
        → tổng số ngày ≤ số ngày khách có → ghi nhận [A, B] → thử nối tiếp C (tối đa 3 tour)
```
**Ràng buộc** (cắt nhánh):
- Không lặp tour.
- Tổng ngày không vượt số ngày khách có, và không ngắn hơn quá 3 ngày (`MAX_SHORTER_DAYS = 3`).
- Đủ ghế cho cả đoàn (em bé không chiếm ghế).
- Lọc tuổi tối thiểu và mức thể lực.

Kịch bản demo (10 ngày, 6 tuần) xét khoảng **1.062 phương án** và chạy trong vài trăm mili-giây. Danh mục tour được cache 60 giây.

### 1.3 "Bài toán này có tên khoa học không?"

**Ngắn:** đó là **ESPPRC**, bài toán đường đi ngắn nhất sơ cấp có ràng buộc tài nguyên.

**Chi tiết:** theo cách mô hình hoá của **Fonseca et al. (2019), n5GTour**:
- **Đỉnh** = tour; **cạnh** = chặng bay/tàu/xe giữa hai thành phố.
- **Tài nguyên** = số ngày của khách.
- **Khung thời gian** của mỗi đỉnh = các ngày khởi hành thật.
- **Sơ cấp** = không đi lại tour đã đi.

Bài báo dùng quy hoạch động có nhãn vì đồ thị điểm tham quan rất lớn. Ở đây chỉ có 36 tour và tối đa 3 chặng, nên **duyệt hết có cắt nhánh** là đủ, và cho kết quả **tối ưu chính xác**, không phải gần đúng.

### 1.4 "Chặng nối giữa 2 tour được tính thế nào?"

**Ngắn:** từ **giờ trả phòng** ở thành phố A, cộng thời gian ra sân bay/ga, thời gian bay hoặc tàu, thời gian về khách sạn ở B, **đổi múi giờ**, rồi so với mốc **21:00** của B.

**Chi tiết:**
```
rời KS ở A: giờ trả phòng của KS tiêu chuẩn, hoặc xe sớm 06:00 (chọn cách để tour B bắt đầu sớm nhất)
+ ra sân bay/ga A (phút, theo từng thành phố) + thời gian chặng + về KS ở B
→ đổi sang giờ địa phương B (Intl.DateTimeFormat, xử lý cả ngày đổi giờ mùa hè)
   đến trước 21:00 (latestArrival)  → tour B bắt đầu NGAY HÔM ĐÓ, không thêm đêm
   đến sau 21:00                    → tour B bắt đầu hôm sau, +1 đêm nối chuyến
   đến quá sớm (trước 08:00, bay đêm) → +1 đêm (cần phòng từ đêm hôm trước)
   B không có chuyến hôm đó         → chờ thêm tối đa 1 ngày, mỗi ngày chờ = +1 đêm
```
**Ví dụ thật** (Barcelona → Marseille): rời 12:00, tàu 338 km, tổng cả cửa-đến-cửa 181 phút, đến Marseille **15:01**. Trước 21:00 nên tour Marseille bắt đầu cùng ngày, không có đêm nối. Vé tàu $132 cho 2 người.

Tiền **đêm nối** = phần lưu trú trong giá tour B chia cho số đêm của tour B.

📂 `smartTourService.js` (`planConnection`), `config/city-logistics.js` (múi giờ, sân bay, khung giờ đón/tiễn)

### 1.5 "Kết quả hiển thị được chọn ra thế nào, sao không bị trùng?"

**Ngắn:** xếp theo điểm, nhưng **ưu tiên chuyến trong ngân sách**, **giữ chỗ cho cả tour đơn lẫn chuyến ghép**, và **mỗi tour xuất hiện tối đa 2 lần**.

**Chi tiết:**
1. Giữ các chuyến ≤ **110% ngân sách** (vượt ≤10% vẫn hiện, kèm cảnh báo "Over budget by $X").
2. Chuyến trong ngân sách luôn đứng trước chuyến vượt ngân sách.
3. Lấy trước tối đa **2 tour đơn** và **2 chuyến ghép** tốt nhất, rồi lấp chỗ còn lại theo điểm, tối đa 6 kết quả.
4. Cùng một **bộ tour** chỉ hiện 1 lần (Paris + Rome ngày 3/12 và ngày 10/12 chỉ giữ ngày tốt hơn).

### 1.6 "Không có kết quả thì sao?"

**Ngắn:** hệ thống **nói rõ ràng buộc nào chặn** và cần đổi gì, theo thứ tự từ lý do chắc chắn nhất.

**Ví dụ thật:**
- Paris + Rome, 12 ngày → *"Paris and Rome need at least 13 days; you have 12."*
- 10 ngày, $3,000 → *"Nothing fits $3,000/person. The cheapest plan in your dates is $4,760/person."* kèm chuyến gần nhất.
- Đoàn quá đông → *"Your group needs N seats but departures in these dates have at most M."*

---

## 2. Smart Tour: chấm điểm (có ví dụ tính tay)

### 2.1 "Smart Tour chấm điểm thế nào?"

**Ngắn:** **8 tiêu chí**, mỗi tiêu chí cho điểm 0–1, nhân trọng số rồi cộng lại, ra thang 0–100. Tiêu chí của từng thành phố được **lấy trung bình có trọng số theo số ngày ở thành phố đó** (5 ngày ở nơi hợp sở thích quan trọng hơn 2 ngày ở nơi không hợp).

| Tiêu chí | Trọng số | Công thức (0–1) |
|---|---|---|
| **Sở thích** | **0.35** | ½ × (trung bình từng thành phố) + ½ × (cả chuyến: mỗi sở thích lấy thành phố tốt nhất) |
| **Thời tiết** | 0.15 | Điểm dễ chịu (`comfort`) của **tháng khởi hành** (Open-Meteo, mục 3.4) |
| **Quãng đường** | 0.10 | `1 − tổng km / max(5000, km xa nhất trong các ứng viên)` |
| **Số ngày** | 0.10 | `max(0, 1 − 2 × số ngày trống / số ngày khách có)` |
| **Ngân sách** | 0.10 | Dùng 70–100% ngân sách → 1; rẻ hơn → giảm dần về 0.6; vượt (≤10%) → 0.4 xuống 0 |
| **Nhịp độ** | 0.10 | Đúng nhịp → 1; lệch 1 bậc (relaxed/balanced/packed) → 0.5; lệch 2 bậc → 0 |
| **Nhóm khách** | 0.05 | Tour có ghi phù hợp nhóm (gia đình, cặp đôi…) → 1, không → 0 |
| **Chặng nối** | 0.05 | `max(0, 1 − 0.25 × số đêm nối − số giờ di chuyển / 40)` |

📂 `smartTourService.js`: `WEIGHTS`, `scorePlan`, `interestCoverage`

### 2.2 "Ví dụ cụ thể: 86 điểm của Barcelona → Marseille ra sao?"

Đầu vào: 10 ngày, $9,000/người, 2 người lớn, sở thích museum + nature, khởi hành 8/12/2026.

| Tiêu chí | Điểm | × Trọng số | = | Vì sao |
|---|---|---|---|---|
| Sở thích | 1.00 | 0.35 | 0.350 | Đủ 2/2: museum (Park Güell, Casa Vicens), nature (Tibidabo, Montjuïc) |
| Thời tiết | 0.38 | 0.15 | 0.057 | Tháng 12 hơi lạnh và mưa (Marseille ~12.8°C, 7.4 ngày mưa) |
| Quãng đường | 0.98 | 0.10 | 0.098 | Chỉ 338 km |
| Số ngày | 0.60 | 0.10 | 0.060 | Chuyến 8 ngày, khách có 10 ngày → trống 2 ngày: `1 − 2×2/10 = 0.6` |
| Ngân sách | 1.00 | 0.10 | 0.100 | $7,376 = 82% ngân sách (trong khoảng 70–100%) |
| Nhịp độ | 1.00 | 0.10 | 0.100 | Khách không chọn nhịp riêng |
| Nhóm khách | 1.00 | 0.05 | 0.050 | Cả 2 tour hợp cặp đôi |
| Chặng nối | 0.92 | 0.05 | 0.046 | 0 đêm nối, ~3 giờ: `1 − 3/40 ≈ 0.92` |
| **Tổng** | | | **0.861 → 86** | |

Trên thẻ có cả lý do (xanh) lẫn cảnh báo (đỏ): *"Marseille in December: ~12.8°C, 7.4 rainy days"*, *"2 of your 10 days left free"*.

### 2.3 "Điểm sở thích tính từ đâu, có chủ quan không?"

**Ngắn:** từ **điểm tham quan thật** gắn với từng thành phố (Wikidata/OSM), có tính **độ nổi tiếng**, không do ai gõ tay.

**Chi tiết:**
- Mỗi điểm tham quan được đóng góp **trọng số** = `0.5 × độ nổi tiếng + 0.5`, trong đó độ nổi tiếng = `log(1 + sitelinks) / log(1 + sitelinks lớn nhất)` (chuẩn hoá min–max theo log). Như vậy Louvre (rất nổi tiếng) được gần **1.0**, một nhà thờ nhỏ được khoảng **0.6**, và điểm từ OSM (0 sitelinks) vẫn được **0.5**.
- Mỗi sở thích của một thành phố = `min(tổng trọng số, 3) / 3`. Tương đương 3 điểm rất nổi tiếng (hoặc 6 điểm ít tên tuổi) là đạt tối đa.
- Món đặc sản của tour được tính như điểm có độ nổi tiếng 0 cho sở thích *food*.
- **Cả chuyến:** lấy thành phố tốt nhất cho từng sở thích, để thưởng các chuyến ghép **bổ sung nhau** (thành phố A mạnh về bảo tàng, thành phố B mạnh về thiên nhiên).

**Căn cứ:** công thức 8 và 11 của **Tsai & Wang (2025), Electronics 14:2077** (`pref = β·POP + (1−β)·ATT`, với β = 0.5; phần ATT thay bằng "có mặt" vì không có dữ liệu thời gian ghé). n5GTour (Fonseca 2019) cũng dùng α = 0.5.

### 2.4 "Sao trọng số lại là 0.35, 0.15…?"

**Ngắn:** sở thích nặng nhất vì đó là lý do khách chọn nơi đến; thời tiết đứng thứ hai; các tiêu chí "hậu cần" nhẹ hơn. Tổng bằng 1. Trọng số được **đặt theo lập luận**, không học từ dữ liệu.

**Chi tiết:** không học trọng số được vì dữ liệu booking hiện là **dữ liệu mẫu** (225/229 booking được tạo trong 1 tuần). Học từ đó chỉ là học lại chính dữ liệu giả. Bài báo Tsai & Wang cũng không công bố trọng số cụ thể. Hướng phát triển: khi có booking thật, ước lượng trọng số bằng hồi quy logistic (chọn / không chọn).

### 2.5 "Sao không xếp theo giá rẻ nhất?"

**Ngắn:** khách có $9,000 thường muốn chuyến **tốt** chứ không phải rẻ nhất. Vì vậy dùng **70–100% ngân sách** được điểm tối đa, rẻ hơn thì giảm nhẹ.

### 2.6 "Điểm quãng đường để làm gì?"

**Ngắn:** chặn các chuyến **nhảy vùng vô lý**, ví dụ "Marseille + Porto + Osaka" trong 12 ngày.

**Chi tiết:** theo công thức 17–18 của Tsai & Wang (2025): `điểm = 1 − DIS chuẩn hoá`. Mẫu số lấy **tối thiểu 5.000 km**, vì nếu chỉ có 1 chuyến ghép thì chuẩn hoá min–max sẽ biến chặng 450 km thành "xa nhất" = 0 điểm (lỗi đã phát hiện khi test và đã sửa).

---

## 3. Dữ liệu: Wikidata, OpenStreetMap, thời tiết, chặng bay

### 3.1 "Wikidata dùng để làm gì?"

**Ngắn:** lấy **điểm tham quan thật** (1.347 điểm) cho cả 36 thành phố. Từ đó (1) chấm điểm sở thích, (2) đo độ nổi tiếng, (3) quyết định **số ngày hợp lý** của tour, (4) làm nội dung cho chatbot.

**Chi tiết:** trước đó mỗi tour chỉ có 3 điểm tham quan. Tour London 10 ngày phải ghé Buckingham Palace 3 lần vì không còn gì khác để xếp.

Quy trình (giống nhau cho cả 36 thành phố):
1. Truy vấn SPARQL: mọi địa điểm trong bán kính **20 km** quanh toạ độ tour, cùng quốc gia, có **≥ 2 sitelinks**.
2. Phân loại theo P31/P279 (instance of / subclass of) thành bảo tàng, nhà thờ, công viên, bãi biển…; loại bỏ những gì không phải điểm tham quan (quận hành chính, trường đại học, công ty).
3. Mỗi loại giữ trước 2 điểm nổi tiếng nhất, rồi lấp theo sitelinks giảm dần, tối đa **40 điểm/thành phố**.
4. Lấy thêm mô tả, toạ độ, ảnh, website, bài Wikipedia, cờ di sản UNESCO.

📂 `backend/scripts/fetch-wikidata-pois.js`, `data/pois/wikidata-pois.json`, model `Poi`

### 3.2 "Sao chọn Wikidata mà không phải Google Places hay TripAdvisor?"

| Tiêu chí | Wikidata | Google Places / TripAdvisor |
|---|---|---|
| Phủ đủ 36 thành phố, **cùng một bộ trường** | ✅ | ✅ nhưng tính phí |
| Giấy phép | **CC0**: được lưu và phân phối lại | Điều khoản **cấm lưu lâu dài** |
| Chỉ số độ nổi tiếng đồng nhất | **sitelinks** (British Museum 109, nhà thờ nhỏ 5) | Số review (lệch theo thị trường) |
| Chi phí | Miễn phí | Tính theo lượt gọi |

Ngoài ra **Tourpedia** chỉ có 6 thành phố. Lấy 6 nơi từ nguồn tốt và 30 nơi từ nguồn khác sẽ làm chất lượng lệch nhau, và Smart Tour sẽ thiên vị những tour tình cờ có nguồn tốt hơn. Nguyên tắc của đồ án là **một nguồn, một luật cho cả 36 tour**.

### 3.3 "Sitelinks là gì?"

**Ngắn:** số phiên bản Wikipedia/Wikivoyage… có bài viết về địa điểm đó, ví dụ có bài ở 109 ngôn ngữ. Đây là thước đo độ nổi tiếng **khách quan, đồng nhất** trên toàn thế giới, không phụ thuộc lượt review của một nền tảng.

### 3.4 "Vậy OpenStreetMap dùng làm gì?"

**Ngắn:** bổ sung **9 điểm** cho các đảo mà Wikidata thiếu: Maldives (bãi biển), Phuket (nightlife), Santorini (bãi biển, điểm ngắm cảnh), Langkawi (đảo).

**Chi tiết:** Wikidata gần như không có bãi biển ở các đảo nhỏ, nên khách chọn "Beach" sẽ thấy Maldives điểm thấp, sai hoàn toàn. Luật bổ sung áp dụng chung cho cả 36 tour: chỉ bổ sung **chủ đề mà tour tự nhận** khi có dưới 2 điểm chứng minh; mỗi chỗ thiếu thêm tối đa 2 điểm OSM.

📂 `scripts/fetch-osm-pois.js`

### 3.5 "Số ngày của tour đặt dựa vào đâu?"

**Ngắn:** theo **số điểm rất nổi tiếng** (≥ 30 sitelinks) của thành phố:

| Số điểm nổi tiếng | Số ngày |
|---|---|
| ≥ 25 | 7 |
| ≥ 15 | 5 |
| ≥ 8 | 4 |
| ≥ 3 | 3 |
| còn lại | 2 |

Riêng tour biển/đảo tối thiểu 4 ngày (khách đến để nghỉ, không phải để xem nhiều điểm). Kết quả: 2 ngày ×6, 3 ngày ×6, 4 ngày ×13, 5 ngày ×7, 7 ngày ×4. Trước đây số ngày được gán theo "giá cao thì tour dài" và chỉ có 4 mức, nên 3 + 5 ngày luôn ra 7, khách có 8 ngày hầu như chỉ nhận được chuyến 7 ngày. **Giá mỗi ngày được giữ nguyên** khi đổi số ngày.

📂 `scripts/apply-duration-rule.js`

### 3.6 "Thời tiết lấy ở đâu, 'điểm dễ chịu' tính thế nào?"

**Ngắn:** **Open-Meteo** (dữ liệu tái phân tích ERA5), **10 năm dữ liệu theo ngày (2016–2025)** tại toạ độ tour, lấy trung bình theo tháng.

**Chi tiết:**
```
điểm nhiệt = 1 − |nhiệt độ cao nhất TB − 24°C| / 12        (24°C dễ chịu nhất, cắt về [0,1])
điểm mưa   = 1 − số ngày mưa (≥1mm) / 20                     (cắt về [0,1])
comfort    = 0.6 × điểm nhiệt + 0.4 × điểm mưa
Tháng đẹp  = các tháng có comfort ≥ (cao nhất − 0.10), ít nhất 3, nhiều nhất 6 tháng
```
Trước đây "tháng đẹp" được gõ tay, và giá theo mùa suy ra từ đó, tức là dựa trên con số tự đặt.

Mình **đã thử và loại** phương án dùng lượt xem Wikipedia làm chỉ số nhu cầu: đúng ở vài nơi nhưng sai ở thành phố lớn, và bị tin tức làm lệch (Kazan 10/2024 vì hội nghị BRICS, Santorini 2/2025 vì động đất).

📂 `scripts/fetch-seasonality.js`

### 3.7 "Chặng bay/tàu giữa 2 thành phố lấy giá ở đâu?"

**Ngắn:** **ước tính theo luật** từ toạ độ thật (khoảng cách haversine), không phải vé thật. Đây là một giới hạn và được nói rõ.

**Chi tiết:** có **36 × 35 chặng** (đồ thị đầy đủ). Phương tiện suy ra bằng luật:
- Khác nhóm đường sắt hoặc > 900 km → **bay**: `2.5 h + d/750`.
- Có đường sắt cao tốc, ≥ 200 km → **tàu**: `0.75 h + d/180`.
- Cùng nước, ≤ 150 km → **xe**: `0.5 h + d/60`.
- Có luật riêng cho vùng núi (cộng 1.5 h ra khỏi thung lũng) và đảo (phà).

Giá = phí cơ bản + km × đơn giá (bay $60 + $0.12/km, tàu $5 + $0.18/km…). Trước đây dữ liệu ghi sai, ví dụ "Lauterbrunnen → Milan đi tàu 1 giờ" (thực tế khoảng 4 giờ qua núi), "Bangkok → Phuket đi tàu 6 giờ" (thực tế phải bay).

📂 `scripts/build-transport-legs.js`

### 3.8 "Dữ liệu booking/người dùng là thật hay giả?"

**Ngắn:** **dữ liệu mẫu**, và đồ án **nói rõ** điều này. 225/229 booking được tạo trong 1 tuần tháng 9/2026. Vì vậy Smart Tour **không chấm điểm theo độ phổ biến** và không dùng ML trên booking; học từ đó chỉ là học lại dữ liệu giả.

### 3.9 "Kiểm tra chất lượng dữ liệu thế nào?"

`scripts/verify-data-quality.js` kiểm tra 52 tiêu chí: giá hiển thị khớp giá thu, ngày kết thúc khớp số ngày, mỗi sở thích tour tự nhận có ≥ 2 điểm chứng minh, số đếm phân tích khớp booking thật… Kết quả hiện tại **51/52**; tiêu chí còn thiếu là Santorini chỉ có 1 điểm cho sở thích chụp ảnh.

---

## 4. Giá, đặt tour, hoàn tiền

### 4.1 "Giá tour tính thế nào?"

```
giá người lớn của chuyến = round10(giá cơ bản × hệ số mùa)
   hệ số mùa: tháng đẹp ×1.20 · tháng kế bên ×1.08 · còn lại ×0.85
trẻ 2–11 tuổi: 70% · em bé 0–1 tuổi: 10% (không chiếm ghế) · từ 12 tuổi: giá người lớn
giảm giá nhóm: từ 10 khách trả tiền (người lớn + trẻ em), theo % admin đặt cho tour
phụ phí khách sạn nâng hạng: theo số phòng (2 khách/phòng)
giảm giá VIP: Silver 5% · Gold 10% · … (áp khi đặt)
```
📂 `services/pricingService.js`, `services/seasonalPricing.js`, `services/vipService.js`

### 4.2 "Làm sao đảm bảo giá chatbot / Smart Tour = giá lúc đặt?"

**Ngắn:** cả ba (trang tour, Smart Tour, chatbot) gọi **cùng một hàm** `calculateBookingPrice`. Khi đặt, **server tính lại** và bỏ qua số client gửi. Đã test: báo giá chatbot cho Paris (2 người lớn + trẻ 5, 1, 14 tuổi) khớp **từng đô la** với giá đặt tour.

### 4.3 "Đặt cả chuyến ghép mà tour sau hết chỗ thì sao?"

**Ngắn:** **tất cả hoặc không**. Server giữ ghế lần lượt từng tour (bằng phép trừ nguyên tử của MongoDB: chỉ trừ khi còn đủ chỗ). Nếu một tour thất bại thì trả lại ghế các tour đã giữ và xoá các booking đã tạo. Không có chuyến "nửa vời". Có test riêng cho trường hợp này.

### 4.4 "Hoàn tiền thế nào?"

| Ai huỷ | Thời điểm | Hoàn vào ví CMP |
|---|---|---|
| Khách | ≥ 30 ngày trước khởi hành | 100% |
| Khách | 14–29 ngày | 50% |
| Khách | < 14 ngày | 0% |
| Admin (lỗi phía công ty) | bất kỳ | 100% |

- **Không hoàn 2 lần:** việc huỷ là một phép cập nhật nguyên tử ("chỉ huỷ nếu chưa huỷ").
- Ghế được trả lại cho chuyến.
- Chi tiêu VIP được trừ lại phần đã hoàn.
- Chuyến ghép: huỷ **từng tour**, các tour khác giữ nguyên.

📂 `services/refundService.js`

---

## 5. Chatbot

### 5.1 "Kiến trúc chatbot?"

```
START → loadMemory → agent ⇄ tools (≤5 vòng) → verify ──ok──► END
                                                 └─ số tiền không có nguồn ─► agent (viết lại 1 lần)
```
- **LangGraph** (`StateGraph`) trong chính backend Express; không thêm server, không thêm database.
- **gpt-4o** trả lời; **gpt-4o-mini** trích sở thích; **text-embedding-3-small** cho RAG.
- Trả lời **streaming** (SSE). Giao diện hiện thẻ có ảnh và nút do **server** dựng.

📂 `backend/chat/` (`retrieval_graph/`, `ingestion_graph/`, `shared/`)

### 5.2 "Agent là gì, khác chatbot hỏi–đáp thường?"

**Ngắn:** chatbot thường trả lời từ những gì nó "biết". **Agent** được **gọi công cụ** (hàm thật của hệ thống) nhiều lần, đọc kết quả rồi mới trả lời.

Ví dụ "Paris cho 2 người lớn và bé 5 tuổi bao nhiêu?":
```
agent → get_departures(Paris)            → chuyến sớm nhất 20/11, còn 12 ghế
agent → quote_price(Paris, 20/11, 2, [5]) → $16,065
agent → viết câu trả lời chỉ bằng các số trên → verify → khách
```

### 5.3 "8 công cụ là gì?"

| Công cụ | Gọi vào | Dùng khi |
|---|---|---|
| `search_tours` | Tour + chủ đề | "Có tour biển nào dưới 5 ngày?" |
| `get_tour` | Tour (lịch trình, bao gồm, ảnh) | "Kể về tour Kyoto" |
| `get_departures` | `Tour.availability` | "Tháng sau còn chỗ không?" |
| `quote_price` | `pricingService` | "Giá cho 2 lớn 1 bé?" |
| `plan_trip` | `smartTourService` | "Tôi thích Maldives, có 10 ngày" |
| `refund_policy` | `refundService` | "Huỷ trước 20 ngày hoàn bao nhiêu?" |
| `my_bookings` | Booking của **chính** người đăng nhập | "Đơn của tôi" |
| `search_knowledge` | RAG (405 đoạn) | "Ở Bangkok nên ăn gì?" |

Tham số công cụ được kiểm tra bằng **zod**. Lỗi công cụ được trả về **như dữ liệu**, để AI đọc và xử lý thay vì làm sập cuộc chat.

### 5.4 "RAG là gì, dùng cho gì?"

**Ngắn:** *Retrieval-Augmented Generation*: tìm đoạn văn liên quan rồi đưa cho AI đọc trước khi trả lời. **Chỉ dùng cho nội dung ít đổi** (mô tả, lịch trình, FAQ, điểm tham quan, blog, chính sách). **Không dùng cho giá, ghế, ngày**, vì những thứ này luôn đi qua công cụ.

**Chi tiết:**
- **Ingestion graph:** 153 tài liệu → cắt đoạn ~900 ký tự → **405 đoạn** → embedding 1536 chiều → MongoDB.
- Chính sách được **sinh từ hằng số trong code** (luật hoàn, khung tuổi, hạng VIP), không gõ tay, nên không thể lệch với hệ thống.
- **Tìm kiếm 3 tầng dự phòng:** Atlas Vector Search → tính cosine trong Node → tìm theo từ khoá (khi chưa có key hoặc embedding lỗi).
- Admin lưu tour thì **tự đánh chỉ mục lại** tour đó.

📂 `chat/ingestion_graph/graph.js`, `chat/shared/retrieval.js`, `scripts/build-chat-index.js`

### 5.5 "Làm sao chatbot không bịa giá? (câu quan trọng nhất)"

**4 lớp:**
1. **Prompt:** mọi giá/ngày/ghế/% phải đến từ kết quả công cụ.
2. **Node `verify`:** trích mọi số tiền (`$5,950`, `5.950$`, `1200 USD`…) trong câu trả lời và so với kết quả công cụ. Chấp nhận nếu bằng (±1), hoặc là phép nhân/chia cho số người (2–12, ví dụ "giá mỗi người" = tổng ÷ 3), hoặc là số khách tự nói (ngân sách) hay số trong sở thích đã nhớ. Không khớp thì AI **phải viết lại**.
3. **Thẻ giá do server dựng** từ kết quả công cụ, không do AI viết.
4. **Server tính lại giá** khi đặt.

Bộ test có ca "AI nói Kyoto $4,999" và ca đó bị chặn. Có cả test riêng chứng minh lần kiểm tra thứ hai **vẫn chặn** (lỗi tinh vi từng có: tin nhắn yêu cầu sửa chứa chính con số bịa).

### 5.6 "Chatbot nhớ được gì?"

| Loại nhớ | Phạm vi | Cách làm |
|---|---|---|
| **Trong 1 cuộc chat** | Cùng lần truy cập | **Checkpointer MongoDB** của LangGraph: lưu nguyên trạng thái graph (cả kết quả công cụ). Tự xoá sau 7 ngày. AI chỉ đọc 10 lượt gần nhất (cắt đúng ranh giới) |
| **Sở thích lâu dài** | Giữa các lần truy cập, **chỉ khách đã đăng nhập** | **MongoDBStore** của LangGraph + cách chấm điểm của TripStar |
| **Log phân tích** | Toàn bộ | `ChatConversation`: mỗi lần truy cập một bản ghi |

Ví dụ đã test: hỏi "Paris 2 người lớn" rồi "and for 3 adults?" thì AI giữ đúng ngày đã tra, không gọi lại lịch khởi hành.

### 5.7 "Bộ nhớ sở thích hoạt động thế nào? Sao không lưu hết?"

**Ngắn:** lưu **sở thích ổn định** có **điểm**, và **quên dần** những gì không được nhắc lại, giống trí nhớ người.

**Chi tiết:**
```
Sau mỗi lượt: gpt-4o-mini trích sở thích ổn định + điểm 0–10 (chạy nền)
  điểm < 4            → không lưu (chỉ là phỏng đoán)
  trùng nội dung      → cộng 40% điểm mới (tối đa 10)
  quên dần            → điểm × 0.97^(số ngày kể từ lần nhắc gần nhất)   (~23 ngày giảm một nửa)
  dưới 2              → xoá
  đưa vào prompt      → 10 sở thích mạnh nhất · tối đa 40 sở thích / khách
```
- Không lưu tên, email, số điện thoại, thanh toán, sức khoẻ (ngoài khả năng đi lại).
- Khách **xem và xoá** được (nút 🧠).
- Test: 6 điểm sau 100 ngày còn `6 × 0.97^100 ≈ 0.29` (dưới 2) → bị quên và xoá khỏi DB.

**Không lưu hết** vì nhồi mọi thứ vào prompt vừa tốn token, vừa làm AI bám vào chi tiết lỗi thời (ví dụ "lần trước hỏi Paris" không có nghĩa là lần nào cũng muốn Paris).

📂 `chat/shared/memory.js`

### 5.8 "Chatbot xử lý tiếng Việt thế nào?"

Server **tự nhận diện** tin nhắn mới nhất có dấu tiếng Việt hay không, và ghi thẳng "Reply in Vietnamese" vào prompt **mỗi lượt**. Trước khi làm vậy, AI hay trả lời tiếng Anh sau khi đọc kết quả công cụ (bằng tiếng Anh); lỗi này bị bộ test bắt được.

### 5.9 "OpenAI chậm hoặc sập thì sao?"

| Lớp | Hành vi |
|---|---|
| `retryPolicy` (LangGraph) | Thử lại tối đa 3 lần, chờ 0.5 → 1 → 2 giây, **chỉ với lỗi tạm thời** (429, 5xx, timeout, đứt mạng). Sai key (401) báo ngay |
| `TimeoutPolicy` | Im lặng 20 giây thì huỷ và thử lại (đồng hồ đặt lại mỗi khi AI stream ra chữ); tối đa 60 giây mỗi lần |
| Hạn chót route | 90 giây → báo lỗi lịch sự |
| RAG | Embedding lỗi → tìm theo từ khoá |
| Khách đóng tab | Ngừng gọi AI (không tốn tiền cho câu không ai đọc) |

Có **5 test giả lập**: OpenAI lỗi 503 một lần, sai key, **treo hẳn**, treo rồi hồi phục.

### 5.10 "Bảo mật / chống lạm dụng?"

- **Chỉ đọc:** AI không tự đặt, huỷ hay thanh toán; khách luôn tự bấm.
- **Giới hạn** 20 tin / 10 phút cho mỗi người dùng/IP; tin nhắn tối đa 1.000 ký tự.
- `my_bookings` chỉ trả đơn của **chính người đang đăng nhập** (xác minh JWT); hội thoại của người đã đăng nhập không ai khác đọc được.
- **Chống XSS:** mọi nội dung được escape trước khi đưa vào HTML; link chỉ chấp nhận trang nội bộ hoặc http(s).
- Ngoài phạm vi (viết code, chính trị…) thì lịch sự từ chối.
- OpenAI key nằm trong `.env`, không commit lên git.

### 5.11 "Sao chọn LangGraph?"

- Agent được mô tả thành **đồ thị rõ ràng** (node/edge), dễ giải thích và thêm bước (như `verify`, `loadMemory`).
- Có sẵn **checkpointer**, **store** (bộ nhớ dài hạn), **retry/timeout theo node**, streaming.
- Repo mẫu được tham khảo (`ai-pdf-chatbot-langchain`, `ai-travel-agent`) cũng dùng LangGraph.
- So với tự viết vòng lặp: ít code hơn, và có nhiều tính năng đã được kiểm chứng.

### 5.12 "Đo chất lượng chatbot thế nào?"

| Bộ test | Nội dung | Kết quả |
|---|---|---|
| `npm run test:chat` | Độ bền (5) + bộ nhớ (7); không tốn tiền | 12/12 |
| `tests/chat/memory-live.test.js` | AI thật, nhớ sở thích qua 2 lần truy cập | Đạt |
| `tests/chat/eval-live.test.js` | **23 câu** Việt/Anh với AI thật; mỗi câu kiểm tra: gọi đúng công cụ, số tiền có nguồn (verify), đúng ngôn ngữ, thẻ đúng (ví dụ mọi chuyến đều có Maldives) | **23/23** |

Bộ 23 câu có cả các lỗi từng gặp (bỏ mất Maldives, trả lời sai ngôn ngữ, nói có giảm giá nhóm khi thực tế 0%), để sửa gì cũng không tái phát.

### 5.13 "Chi phí một câu trả lời?"

Khoảng **1–3 cent** với gpt-4o (prompt có định nghĩa công cụ và 1–3 lần gọi model). Đổi sang gpt-4o-mini (rẻ hơn khoảng 15 lần) chỉ bằng biến `CHAT_MODEL`. Tạo embedding cho toàn bộ 405 đoạn tốn vài cent và mất 8 giây.

---

## 6. Dashboard admin

### 6.1 "Admin và web có khớp nhau không?"

Đã rà và sửa các chỗ từng lệch:

| Trước | Giờ |
|---|---|
| Admin đổi giá, web vẫn thu **giá cũ** (giá lưu trên từng chuyến) | Đổi giá / số ngày / tháng đẹp → **tính lại** giá và ngày kết thúc mọi chuyến |
| "Duration" là chữ tự do, web tính theo số khác | Ô **số ngày thật**; bị chặn đổi nếu còn booking sắp đi |
| Không quản lý được chuyến khởi hành | Tab **Departures** (thêm / sửa ghế / xoá; server tự tính ngày về + giá mùa) |
| Giảm giá nhóm chỉ hiện, không áp dụng | **Áp dụng thật** |
| Admin sửa được ngày/số khách của booking (lệch ghế) | Chỉ sửa thông tin liên hệ + ghi chú |
| Xoá được tour/chuyến còn booking; mở lại được booking đã huỷ | **Chặn** |
| VIP chỉ cộng khi admin bấm "đã trả" | Mọi đường thanh toán đều cộng |
| Review xếp theo ngày, rải rác | **Nhóm theo tour** |

---

## 7. Câu hỏi "bẫy" và giới hạn của đồ án

### 7.1 "Đồ án có dùng Machine Learning không?"

**Thật thà:**
- **Smart Tour** là tối ưu tổ hợp + chấm điểm đa tiêu chí, không phải ML. Đây là lựa chọn có chủ đích vì dữ liệu hành vi là dữ liệu mẫu.
- **Chatbot** dùng mô hình học sâu đã huấn luyện sẵn: LLM (gpt-4o), embedding, cùng Detoxify cho kiểm duyệt bình luận (có từ trước).
- **Hướng phát triển** (đã phân tích, dữ liệu phù hợp):
  - Phân tích review theo khía cạnh: embedding + gom cụm, trên 257 review thật.
  - Khai thác nhu cầu từ log chatbot.
  - Phát hiện bất thường trong booking/thanh toán (Isolation Forest), ví dụ lợi dụng luật hoàn 100%.

### 7.2 "Giới hạn của hệ thống?"

1. **Giá chặng nối** là **ước tính** theo khoảng cách, không phải vé thật; **chưa tính vé bay từ Việt Nam** đi và về. Hướng phát triển: công cụ tra vé thật (SerpAPI / Google Flights).
2. **Thời tiết** là **trung bình 10 năm theo tháng**, không phải dự báo cho ngày cụ thể.
3. **Trọng số** chấm điểm đặt theo lập luận; chưa học từ hành vi thật.
4. **AI có tính ngẫu nhiên:** câu chữ khác nhau giữa các lần. Số liệu được bảo vệ bằng công cụ + `verify` + bộ test, nhưng cách diễn đạt có thể khác.
5. Số ghế chatbot nhắc lại từ kết quả tra trước đó có thể **lệch** nếu vừa có người đặt; khi đặt, server luôn kiểm tra ghế thật.
6. Tour **mới tạo từ dashboard** đặt được ngay, nhưng muốn **ghép** trong Smart Tour thì cần chạy script dữ liệu (chặng bay, sân bay, điểm tham quan).

### 7.3 "Thêm một thành phố mới thì phải làm gì?"

1. Tạo tour ở dashboard (số ngày, giá, toạ độ).
2. Thêm chuyến khởi hành ở tab Departures.
3. Chạy các script theo thứ tự: `fetch-wikidata-pois` → `import-pois` → `fetch-seasonality` → `build-transport-legs` → `apply-city-logistics` → `build-guide-schedule` → `build-chat-index`.
4. Kiểm tra bằng `verify-data-quality`.

Tất cả dùng **cùng một luật** như 36 thành phố hiện có.

### 7.4 "Nếu 2 người cùng đặt ghế cuối cùng?"

Việc giữ ghế dùng phép cập nhật **nguyên tử** của MongoDB (`$inc` có điều kiện `availableSlots ≥ số ghế`). Chỉ một người thành công, người kia nhận lỗi "Not enough seats" kèm gợi ý các chuyến khác. Trừ tiền ví cũng nguyên tử, nên không thể âm ví khi bấm thanh toán hai lần.

### 7.5 "Sao chatbot không tự đặt tour cho nhanh?"

Đặt tour là hành động **mất tiền và khó hoàn tác**. AI có thể hiểu nhầm ("3 người" thành "3 người lớn"), nên khách **luôn tự xác nhận** trên trang đặt chỗ đã điền sẵn. Chatbot làm phần khó (tìm, ghép, báo giá), con người làm phần cam kết.

### 7.6 "Tham khảo những nguồn nào?"

- **Tsai, C.-Y. & Wang, J.-H. (2025).** *A Personalized Itinerary Recommender System: Considering Sequential Pattern Mining.* Electronics 14(10):2077. Dùng: điểm quãng đường, độ nổi tiếng điểm tham quan (công thức 8, 11, 17–18).
- **Fonseca, F. et al. (2019).** *Personalized Travel Itineraries with Multi-access Edge Computing Touristic Services.* IEEE Globecom. Dùng: mô hình hoá ESPPRC, α = 0.5.
- Repo tham khảo kiến trúc:
  - `mayooear/ai-pdf-chatbot-langchain`: ingestion/retrieval graph.
  - `nirbar1985/ai-travel-agent`: checkpointer, human-in-the-loop.
  - `1sdv/TripStar`: bộ nhớ sở thích có điểm và quên dần.
  - `langchain-ai/langgraph`: retry/timeout, store.
- **Nguồn dữ liệu:** Wikidata (CC0), OpenStreetMap (ODbL), Open-Meteo ERA5 (CC BY 4.0).
