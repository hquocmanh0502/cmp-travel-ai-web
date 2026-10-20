# Thời tiết theo tháng của 36 thành phố

`seasonality.json`: nhiệt độ cao nhất trung bình và số ngày mưa (≥ 1 mm) trung bình theo tháng, tính tại toạ độ của từng tour.

| | |
|---|---|
| Nguồn | Open-Meteo Historical Weather API (ERA5), dữ liệu ngày 2016-01-01 → 2025-12-31 |
| Giấy phép | **CC BY 4.0**, phải ghi nguồn "Weather data by Open-Meteo.com" |
| Tải lại / ghi DB | `node scripts/fetch-seasonality.js` (từ thư mục `backend`) |
| Dùng cho | `Tour.seasonality`, `Tour.bestTimeToVisit`, và giá theo mùa (`services/seasonalPricing.js`) |

Công thức "điểm dễ chịu", cách chọn tháng đẹp, và lý do **không** dùng lượt xem Wikipedia làm chỉ số nhu cầu: xem phần đầu `backend/scripts/fetch-seasonality.js`.
