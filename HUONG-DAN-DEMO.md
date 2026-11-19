# Hướng dẫn demo: Smart Tour + Chatbot AI (CMP Travel)

> Mục tiêu: trong khoảng 20–25 phút, cho thầy thấy **3 điểm mạnh** của đồ án:
> 1. **Smart Tour** không chỉ lọc tour: nó **ghép 2–3 tour nối tiếp** theo lịch khởi hành thật, giờ bay thật, múi giờ, rồi **chấm điểm có giải thích**, dựa trên bài báo khoa học.
> 2. **Chatbot** không bịa số: mọi giá/ngày/ghế lấy từ **chính code đặt tour**, có bước **kiểm chứng** chặn giá bịa, và **đặt tour được ngay từ khung chat**.
> 3. **Toàn bộ khớp nhau**: web, chatbot và dashboard admin dùng chung một nguồn dữ liệu và cùng một công thức giá.
>
> Kết quả ghi trong file này được chạy thật ngày 19/11/2026. Ngày đi, giá và ghế có thể lệch một chút khi demo vì dữ liệu sống, nhưng **hành vi** thì giữ nguyên.

---

## 0. Chuẩn bị TRƯỚC giờ demo (làm trước 30 phút)

### 0.1 Kiểm tra nhanh

| # | Việc | Lệnh / cách làm | Mong đợi |
|---|---|---|---|
| 1 | OpenAI key còn dùng được (nếu đã đổi key mới thì sửa `backend/.env`) | Mở `backend/.env`, xem dòng `OPENAI_API_KEY=` | Có key |
| 2 | Chạy test nhanh (không tốn tiền) | `cd backend` → `npm run test:chat` | `reliability: all passed` và `memory: all passed` |
| 3 | Khởi động server web | `cd backend` → `node .\server.js` | `Server running on port 3000` |
| 4 | Khởi động dashboard admin | `cd travelie_dashboard` → `npm run dev` | Mở `http://localhost:5173` |
| 5 | Trình chiếu bằng cửa sổ thường (không ẩn danh), tải lại trang bằng **Ctrl+F5** | | Khung chat hiện ở góc phải dưới |
| 6 | Kiểm tra chatbot sống | Mở `http://localhost:3000/api/chatbot/status` | `"status":"active"`, `"knowledgeChunks":405` |

### 0.2 Tài khoản

- **Tài khoản khách** để demo đặt tour và bộ nhớ: đăng nhập sẵn ở một tab. Vào `profile.html#wallet` xem **số dư ví**. Muốn demo bấm "Pay Trip" trọn vẹn thì ví cần đủ tiền (khoảng $15,000–25,000 cho chuyến ghép 2 người). Nếu không đủ, vẫn demo được: modal sẽ báo "thiếu $X" và đó cũng là một tính năng.
- **Tài khoản admin**: `admin@cmptravel.com` (đăng nhập dashboard).

### 0.3 Dọn dẹp

- Vào **My Bookings**, huỷ các booking test cũ (ví dụ booking **Lauterbrunnen** tạo ngày 18/11 theo giá cũ 5 ngày).
- Bấm nút **↻ New conversation** trong khung chat để khung chat sạch.

### 0.4 Mở sẵn các tab

1. `http://localhost:3000/index.html` (trang chủ, có khung chat)
2. `http://localhost:3000/smart-tour.html`
3. `http://localhost:3000/my-bookings.html` (đã đăng nhập)
4. `http://localhost:5173` (dashboard admin)

---

## 1. Kịch bản tổng (25 phút)

```
 2'  Mở đầu: bài toán + kiến trúc
 8'  PHẦN A: Smart Tour (ghép tour, chấm điểm, giải thích, đặt cả chuyến)
10'  PHẦN B: Chatbot (giá thật, ghép tour trong chat, đặt tour, nhớ ngữ cảnh, chống bịa, nhớ sở thích)
 3'  PHẦN C: Dashboard admin (chuyến khởi hành, hoàn tiền, review theo tour)
 2'  Kỹ thuật & kiểm thử (số liệu test), hỏi đáp
```

### Câu mở đầu gợi ý

> "Website du lịch thường chỉ cho khách **lọc** tour. Khách muốn đi **10 ngày, 2 nước, $9,000** thì phải tự ghép: tự xem ngày khởi hành, tự tính giờ bay, tự lo đêm nối chuyến. Đồ án của em giải bài toán đó bằng **Smart Tour**, rồi đưa nó vào một **chatbot AI** để khách chỉ cần nói một câu là có chuyến đi, giá chính xác, và đặt được ngay."

### Sơ đồ kiến trúc (cho thầy xem nếu hỏi)

```
Trình duyệt (HTML/JS)          Dashboard admin (React)
   │  Smart Tour form             │
   │  Khung chat (SSE)            │
   ▼                              ▼
Express (Node.js, port 3000) ──────────────────────────────────────────┐
 ├─ smartTourService   : ghép tour (A/B), chặng nối, chấm điểm 8 tiêu chí│
 ├─ pricingService     : giá theo mùa, khung tuổi, giảm giá nhóm         │
 ├─ refundService      : huỷ + hoàn tiền theo số ngày                    │
 ├─ chat/ (LangGraph)  : agent ⇄ 8 công cụ → verify; checkpoint; bộ nhớ │
 └─ MongoDB Atlas      : 36 tour · 1.356 điểm tham quan · 405 đoạn RAG   │
                          · booking · hội thoại · checkpoint · sở thích   │
OpenAI: gpt-4o (trả lời) · gpt-4o-mini (trích sở thích) · embedding      ─┘
```

---

## 2. PHẦN A: Smart Tour (8 phút)

### A1. Ghép tour nhiều thành phố

**Làm:** mở `smart-tour.html`, nhập:

| Ô | Giá trị |
|---|---|
| Departure window | từ **1 tuần sau** đến khoảng **6 tuần sau** |
| Days | **10** |
| Budget (per person) | **9000** |
| Adults | **2** |
| Interests | **museum**, **nature** (Smart Tour không có mục "art") |
| Max tours | **Up to 3** |

Bấm **Find my trip**.

**Kết quả mong đợi** (ngày 19/11): kiểm tra khoảng **1.062 phương án**, đứng đầu là các chuyến ghép như
**Barcelona → Marseille (86 điểm, ~$7,376/người)**, Barcelona → Santorini, Marseille → Florence…

**Chỉ cho thầy trên 1 thẻ chuyến ghép:**
1. **Dòng thời gian từng chặng**: ngày đi–về của từng tour, khách sạn tiêu chuẩn.
2. **Chặng nối**: "train/flight to …, arrive 14:20 (giờ địa phương)", tiền vé, **đêm nối chuyến** nếu đến sau 21:00.
   > "Hệ thống tính giờ trả phòng ở thành phố A, thời gian ra sân bay, giờ bay, đổi **múi giờ**. Đến trước 21:00 thì tour sau bắt đầu ngay hôm đó, đến muộn thì cộng 1 đêm khách sạn vào giá."
3. **Lý do (xanh) / cảnh báo (đỏ)**, ví dụ "Matches 2/2 interests: museum (Park Güell, Casa Vicens); nature (Tibidabo, Montjuïc)", "Marseille in December: ~12.8°C, 7.4 rainy days".
4. **Thanh điểm 8 tiêu chí** (interests, weather, duration, budget, pace, group, connections, distance).

**Điểm hay để nói:**
- Chỉ ghép trên **lịch khởi hành có thật và còn đủ ghế** cho cả đoàn, không bịa ngày.
- Điểm sở thích dựa trên **1.356 điểm tham quan thật** (Wikidata/OSM), có tính **độ nổi tiếng** (số sitelinks).
- Điểm quãng đường và độ nổi tiếng theo **Tsai & Wang (2025), Electronics 14:2077** (công thức 8, 11, 17–18). Bài toán ghép tour chính là dạng **ESPPRC** (tìm đường có ràng buộc tài nguyên) như **Fonseca et al. (2019), n5GTour**: tài nguyên = số ngày, khung thời gian = ngày khởi hành, không lặp tour.
- Kết quả luôn **trộn cả tour đơn lẫn chuyến ghép**, mỗi tour xuất hiện tối đa 2 lần, nên danh sách không bị trùng lặp.

### A2. Gia đình có trẻ em

**Làm:** đổi thành **7 ngày, $6,000, 2 người lớn + thêm 1 trẻ 5 tuổi**, interests **beach**.

**Mong đợi:** **Phuket** (~$3,672/người), Langkawi, Santorini…

**Nói:** "Trẻ 2–11 tuổi tính 70% giá, dưới 2 tuổi 10% và không chiếm ghế, từ 12 tuổi tính như người lớn. Tour có tuổi tối thiểu hoặc độ khó cao tự động bị loại."

### A3. Giải thích khi KHÔNG có kết quả (điểm rất hay)

**Làm 1:** **Must include** chọn **Paris** và **Rome**, mode **All of them**, **12 ngày**, budget 15000.

**Mong đợi:** không có chuyến nào, kèm gợi ý
**"Paris and Rome need at least 13 days; you have 12."**
→ Sửa thành **13 ngày** rồi chạy lại để có kết quả.

**Làm 2:** 10 ngày, budget **3000**.

**Mong đợi:** **"Nothing fits $3,000/person. The cheapest plan in your dates is $4,760/person."** + hiện chuyến gần nhất.

**Nói:** "Hệ thống không bao giờ để khách gặp màn hình trống: nó nói rõ ràng buộc nào chặn và cần đổi gì."

### A4. Đặt cả chuyến ghép (trả 1 lần)

**Làm:** quay lại kết quả A1 → trên một thẻ chuyến ghép bấm **Book this trip**.

**Chỉ cho thầy ở trang RESERVATION:**
- Ô tóm tắt **liệt kê từng tour + chặng nối + tổng**.
- Check-out **đúng ngày kết thúc thật** của tour cuối.

Điền thông tin, chọn phòng → **Submit** → sang **My Bookings**:
- Mỗi tour là một booking có nhãn **"Smart Tour trip · tour 1 of 2"**, và dòng chặng nối.
- Bấm **Pay Trip**: trừ ví **1 lần cho cả chuyến**.

**Nói:**
- "Server tính lại giá, không tin số client gửi."
- "Giữ ghế **tất cả hoặc không**: nếu tour thứ 2 hết chỗ, ghế tour 1 được trả lại, không có chuyến 'nửa vời'."

### A5. Huỷ và hoàn tiền

**Làm:** ở My Bookings bấm **Cancel** một tour trong chuyến.

**Mong đợi:** hộp xác nhận báo trước **"Departure in N days: refund X% = $…"**.
Luật hoàn: **≥30 ngày 100% · 14–29 ngày 50% · <14 ngày 0%**; admin huỷ thì luôn 100%. Tiền vào ví, ghế được trả lại, các tour khác trong chuyến **giữ nguyên**.

---

## 3. PHẦN B: Chatbot AI (10 phút)

> Gõ đúng các câu bên dưới. Trong lúc chờ, khung chat hiện **"Checking departures and seats…", "Calculating the price…"**: đó là AI đang gọi công cụ thật.

### B1. Báo giá chính xác, khớp 100% với trang đặt tour

**Gõ:** `Price of Paris for 2 adults and a 5-year-old`

**Mong đợi:** AI tự tìm **chuyến sớm nhất** (ví dụ 20/11), báo **tổng ~$16,065** cho cả đoàn, kèm thẻ có ảnh, ngày, **số ghế còn** và nút **Book this date**.

**Chứng minh không bịa:** bấm **Book this date** → trang tour mở với **đúng ngày đã chọn sẵn** → chọn 2 người lớn + 1 trẻ → giá trên trang **trùng con số chatbot nói**.

**Nói:** "Chatbot không tự tính giá. Nó gọi **cùng hàm `pricingService`** mà trang đặt tour dùng."

### B2. Nhớ ngữ cảnh trong cuộc chat

**Gõ tiếp:** `and for 3 adults?`

**Mong đợi:** AI **giữ đúng ngày khởi hành** vừa rồi và báo giá cho 3 người lớn, **không tra lại** lịch.

**Gõ tiếp:** `how many seats are left on that departure?` → trả lời đúng chuyến đó.

**Nói:** "Em dùng **checkpointer của LangGraph lưu vào MongoDB**: AI nhớ **nguyên kết quả các công cụ** đã gọi, không chỉ nhớ chữ."

### B3. Smart Tour ngay trong chat + giữ nơi khách yêu thích

**Gõ:** `i love maldives so much, but i also want to visit other place like paris`

**Mong đợi:**
- AI gọi Smart Tour với **Maldives + Paris là bắt buộc**.
- 10 ngày không đủ (chặng bay dài cần thêm đêm nối) → **tự kéo lên 12 ngày** và nói rõ.
- Thẻ chuyến như **Paris → Bordeaux → Maldives**, có ảnh từng chặng, chặng bay, tổng tiền, và 2 nút **Book this trip** và **Compare in Smart Tour**.

**Bấm "Compare in Smart Tour":** trang Smart Tour mở với **form đã điền sẵn** (Paris, Maldives, 12 ngày, số người…) và **tự chạy** ra bảng so sánh đầy đủ.

**Gõ tiếp:** `but i want to visit historical place, and other food place` → các chuyến **vẫn giữ Maldives**, thêm sở thích lịch sử + ẩm thực.

**Nói:** "Đây là lỗi em từng gặp: AI bỏ mất Maldives. Em sửa ở **tầng công cụ** (không chỉ ở prompt): không ghép được thì **thêm ngày trước**, vẫn không được thì **giữ nơi khách nhắc đầu tiên**. Ca này nằm trong bộ test tự động."

### B4. Giới thiệu tour có ảnh + đặt ngay trong chat

**Gõ:** `Tell me about the Kyoto tour`

**Mong đợi:** thẻ lớn có **ảnh + dải 4 ảnh**, sao đánh giá, chủ đề, điểm nổi bật; nút **Check dates & book**.

**Bấm "Check dates & book":** chatbot tự hỏi lịch → hiện các thẻ ngày đi, mỗi thẻ có **Book this date**.

### B5. Tiếng Việt + chính sách

**Gõ:** `Huỷ tour trước 20 ngày thì được hoàn bao nhiêu?`

**Mong đợi:** trả lời **bằng tiếng Việt**: hoàn **50%**, kèm luật đầy đủ.

**Nói:** "Server tự nhận diện ngôn ngữ tin nhắn mới nhất. Luật hoàn tiền lấy từ **chính hằng số trong code**, nên chatbot không thể nói khác hệ thống."

### B6. Không bịa và không lạc đề

| Gõ | Mong đợi |
|---|---|
| `Do you have a tour to Hanoi?` | "Không có", gợi ý tìm điểm khác, **không bịa tour** |
| `Write me a Python script to sort a list.` | Lịch sự từ chối, quay về chủ đề du lịch |
| `Paris tour on 2099-01-01 price?` | "Không có chuyến ngày đó", gợi ý chuyến gần nhất, không báo giá cho 2099 |

**Nói về bước kiểm chứng (verify):**
> "Sau khi AI viết xong, một node `verify` trích **mọi số tiền** trong câu trả lời và so với kết quả công cụ. Số nào không có nguồn, AI phải viết lại. Ngân sách khách tự nói (ví dụ '6000 đô') thì được chấp nhận."

### B7. Nhớ sở thích lâu dài (cần ĐĂNG NHẬP)

1. Đăng nhập tài khoản khách → bấm **↻ New conversation**.
2. **Gõ:** `I always travel with my wife and our 5-year-old son. We love beaches and we don't like rushing.`
3. Đợi trả lời xong, bấm nút **🧠** trên đầu khung chat → hiện danh sách AI nhớ:
   *Travels with wife and a 5-year-old son · Loves beach destinations · Dislikes rushed itineraries*
4. Bấm **↻ New conversation** (cuộc chat mới, khung trắng).
5. **Gõ:** `Plan a 7-day trip for us please`

**Mong đợi:** AI **tự dùng** 2 người lớn + bé 5 tuổi + biển + nhịp thong thả, và nói "since you usually travel with your wife and 5-year-old son…".

**Nói:**
- "Cách làm theo repo **TripStar**: mỗi sở thích có **điểm 0–10**, nhắc lại thì cộng điểm, **giảm 3% mỗi ngày** nếu không nhắc lại, dưới ngưỡng thì quên. Lưu bằng **MongoDBStore của LangGraph**."
- "Khách **xem và xoá** được (nút 🧠). Không lưu tên, email, số điện thoại hay thông tin thanh toán."

Sau demo bấm **🧠 → Forget everything** để dọn.

---

## 4. PHẦN C: Dashboard admin (3 phút)

| Màn hình | Làm | Điểm hay |
|---|---|---|
| **Tours → Edit → tab Departures** | Thêm một chuyến (chỉ nhập ngày đi + số ghế) | Server **tự tính ngày kết thúc + giá theo mùa** bằng đúng công thức của web; cột "Booked seats"; không xoá được chuyến đang có booking |
| **Tours → Edit → Duration** | Chỉ để nói, không cần đổi | Đổi số ngày hoặc giá thì **mọi chuyến được tính lại**; bị chặn nếu đang có booking sắp đi |
| **Bookings** | Mở booking vừa đặt ở A4 | Nhãn **Smart Tour trip**, dòng **chặng nối** + **giảm giá VIP** trong chi tiết giá; ngày/số khách **khoá** (đổi là lệch ghế) |
| **Reviews** | Cuộn danh sách | **Nhóm theo tour (A→Z)**, mới nhất trước trong từng tour |

**Nói:** "Trước đây dashboard và web lệch nhau, ví dụ admin đổi giá nhưng web vẫn thu giá cũ, hay giảm giá nhóm hiện trên dashboard mà không áp dụng. Em đã rà và thống nhất **một nguồn sự thật**."

---

## 5. Kỹ thuật & kiểm thử (nói khi thầy hỏi "làm sao biết nó đúng?")

### 5.1 Graph của chatbot (LangGraph)

```
START → loadMemory → agent ⇄ tools (tối đa 5 vòng) → verify ──ok──► END
                                                       └─ số tiền không có nguồn ─► agent (viết lại 1 lần)
```

| Thành phần | Chi tiết |
|---|---|
| 8 công cụ | search_tours · get_tour · get_departures · quote_price · plan_trip · refund_policy · my_bookings · search_knowledge |
| RAG | 405 đoạn (tour, lịch trình, FAQ, điểm tham quan, blog, chính sách), embedding `text-embedding-3-small`; có dự phòng 3 tầng (Atlas Vector Search → cosine trong Node → từ khoá) |
| Bộ nhớ ngắn hạn | Checkpointer MongoDB, tự xoá sau 7 ngày |
| Bộ nhớ dài hạn | MongoDBStore, điểm + quên dần, top-10 đưa vào prompt |
| Độ bền | `retryPolicy` (3 lần, chỉ lỗi tạm thời 429/5xx/timeout), `TimeoutPolicy` (im lặng 20 giây thì huỷ), hạn chót 90 giây; embedding lỗi thì chuyển sang tìm theo từ khoá |
| An toàn | Chỉ đọc (không tự đặt/huỷ), giới hạn 20 tin/10 phút, chống XSS, đơn hàng chỉ của chính người dùng |

### 5.2 Số liệu kiểm thử (chạy cho thầy xem nếu có thời gian)

```powershell
cd "d:\Projects\CMP Travel\backend"
npm run test:chat          # 12 test, không tốn tiền: độ bền (OpenAI lỗi 503 / sai key / treo) + bộ nhớ
npm run test:chat:live     # model thật: nhớ sở thích qua 2 lần truy cập + bộ 23 câu hỏi
```

| Bộ test | Kết quả |
|---|---|
| Độ bền (giả lập OpenAI 503, sai key, **treo hẳn**, treo rồi hồi phục) | 5/5 |
| Bộ nhớ (lưu, gộp, quên dần 100 ngày, xoá, đưa vào prompt) | 7/7 |
| Bộ nhớ trọn vòng với AI thật (2 lần truy cập) | Đạt |
| **23 câu hỏi với AI thật** (công cụ đúng, số tiền có nguồn, đúng tiếng Việt, thẻ đúng, ca Maldives) | **23/23** |

---

## 6. Câu hỏi thầy có thể hỏi

> Bộ câu hỏi **chi tiết** (cách chấm điểm từng tiêu chí kèm ví dụ tính tay, Wikidata để làm gì, thời tiết, giá theo mùa, chatbot, giới hạn của đồ án…) nằm ở file **[HOI-DAP-BAO-VE.md](HOI-DAP-BAO-VE.md)**. Dưới đây là bản ngắn.

**"AI có bịa giá không?"**
→ Không thể đưa giá bịa ra mà không bị phát hiện: (1) giá chỉ đến từ công cụ gọi `pricingService`; (2) node `verify` đối chiếu từng số tiền; (3) thẻ giá do **server** dựng, không phải AI viết; (4) khi đặt, server **tính lại** giá.

**"Sao không dùng RAG cho cả giá?"**
→ Giá, ghế và ngày **thay đổi liên tục**. Đưa vào tài liệu thì chatbot sẽ trả lời theo số cũ. RAG chỉ dùng cho nội dung ít đổi (mô tả, lịch trình, ẩm thực); số liệu sống luôn đi qua công cụ.

**"Khác gì so với repo mẫu (ai-pdf-chatbot-langchain)?"**
→ Giữ bộ khung LangGraph (ingestion graph / retrieval graph), nhưng: thay router 1 nhánh bằng **agent nhiều công cụ** (trả lời được câu hỏi lai), thêm **verify**, thay Supabase bằng **MongoDB** (cùng DB với web), thêm checkpointer, bộ nhớ dài hạn và độ bền.

**"Smart Tour có phải AI không?"**
→ Là **thuật toán tối ưu có ràng buộc** (dạng ESPPRC) + **chấm điểm đa tiêu chí** có trọng số, dựa trên bài báo (Tsai & Wang 2025; Fonseca et al. 2019). Không dùng ML trên dữ liệu booking, vì booking hiện là **dữ liệu mẫu**; học từ đó chỉ là học lại dữ liệu giả. Đây là lựa chọn có chủ đích.

**"Dữ liệu điểm tham quan lấy từ đâu?"**
→ Wikidata (1.347 điểm) + OpenStreetMap (9 điểm cho các đảo), **cùng một luật cho cả 36 thành phố**; độ nổi tiếng là số sitelinks Wikidata; thời tiết theo tháng từ Open-Meteo.

**"Nếu OpenAI sập lúc khách đang chat?"**
→ Lỗi tạm thời thì tự thử lại tối đa 3 lần; treo quá 20 giây thì huỷ và thử lại; quá 90 giây thì báo lỗi lịch sự. Có test giả lập đúng các tình huống này.

**"Chi phí?"**
→ Mỗi câu trả lời khoảng 1–3 cent với `gpt-4o`; đổi sang `gpt-4o-mini` (rẻ hơn khoảng 15 lần) chỉ bằng biến `CHAT_MODEL`. Trích sở thích dùng `gpt-4o-mini`. Có giới hạn 20 tin/10 phút cho mỗi người dùng.

---

## 7. Xử lý sự cố khi đang demo

| Sự cố | Cách xử lý |
|---|---|
| Khung chat báo "not configured" | Server chưa đọc key: kiểm tra `backend/.env`, khởi động lại `node .\server.js` |
| Chatbot báo lỗi / quá lâu | Mạng hoặc OpenAI chậm: nói về cơ chế retry/timeout, chạy `npm run test:chat` để chứng minh; demo tiếp Smart Tour (không cần OpenAI) |
| Không kết nối được MongoDB (lỗi `querySrv`) | Mạng chặn DNS: đổi mạng / bật 4G; `config/db.js` đã tự chuyển sang DNS 1.1.1.1 |
| Smart Tour không có chuyến ghép | Nới **Departure window** rộng hơn (≥ 6 tuần) hoặc tăng **Days** |
| Pay Trip báo thiếu tiền | Nói đây là tính năng (báo thiếu bao nhiêu); nạp ví ở `profile.html#wallet` nếu có thời gian |
| Trang hiển thị cũ / khung chat lạ | **Ctrl+F5** (xoá cache CSS/JS) |
| AI trả lời hơi khác câu chữ trong file này | Bình thường (AI có tính ngẫu nhiên); **số liệu** vẫn khớp công cụ |

---

## 8. Sau demo

- [ ] Huỷ các booking test ở My Bookings (ghế được trả, ví được hoàn theo luật)
- [ ] Chatbot: 🧠 → **Forget everything**, ↻ New conversation
- [ ] Xoá chuyến khởi hành test vừa thêm ở dashboard (nếu có)
- [ ] Nếu OpenAI key từng bị lộ: tạo key mới, xoá key cũ, cập nhật `backend/.env`
