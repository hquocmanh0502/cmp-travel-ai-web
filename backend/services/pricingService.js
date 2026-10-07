// backend/services/pricingService.js
//
// Nơi DUY NHẤT tính giá một booking.
//
// Mô hình giá:
//   Giá tour đã bao gồm khách sạn TIÊU CHUẨN (hạng rẻ nhất trong tour.hotelTiers).
//   Chọn khách sạn cao hơn thì trả thêm phụ phí (surcharge) cho cả chuyến.
//   Chọn phòng chỉ để kiểm tra sức chứa, KHÔNG tính tiền theo phòng - nếu tính
//   sẽ trùng với phần lưu trú vốn đã nằm trong giá tour.
//
// Trước đây backend nhận thẳng totalAmount và accommodationCost do client gửi lên,
// nghĩa là sửa request là đặt tour giá 0 đồng. Giờ mọi con số đều tính lại ở đây.

const CHILD_RATE = 0.7;   // trẻ em trả 70% giá người lớn
const INFANT_RATE = 0.1;  // em bé trả 10%

/**
 * Tìm hạng khách sạn tương ứng với khách sạn khách chọn.
 * Trả về hạng tiêu chuẩn (phụ phí 0) nếu không khớp hoặc tour chưa cấu hình hạng.
 */
function resolveHotelTier(tour, hotelId) {
  const tiers = tour.hotelTiers || [];
  if (tiers.length === 0) return null;

  // Hạng tiêu chuẩn là hạng có phụ phí thấp nhất.
  const standard = tiers.reduce((min, t) => (t.surcharge < min.surcharge ? t : min), tiers[0]);
  if (!hotelId) return standard;

  const chosen = tiers.find(t => String(t.hotelId) === String(hotelId));
  return chosen || standard;
}

/**
 * Tính toàn bộ chi phí của một booking.
 *
 * @param {object} tour   document Tour (đã lấy từ DB)
 * @param {object} input  { adults, children, infants, hotelId, guide, servicesCost }
 * @returns {object} chi tiết từng khoản + tổng trước giảm giá
 */
function calculateBookingPrice(tour, input = {}) {
  const adults = Math.max(1, parseInt(input.adults) || 1);
  const children = Math.max(0, parseInt(input.children) || 0);
  const infants = Math.max(0, parseInt(input.infants) || 0);

  // Gia TINH TIEN chinh thuc la pricing.adult (gia co ban).
  //
  // Luu y cho nguoi sua sau: availability[].price co he so theo mua (+20% chinh
  // mua, -15% thap diem, do scripts/fix-availability-seasonality.js sinh ra) va
  // hien CHUA duoc dung de tinh tien - no la du lieu cho SmartTour tra loi "di
  // thang nao re hon". Neu sau nay cho giao dien hien gia theo mua thi phai sua
  // ca o day, neu khong khach se thay mot gia nhung bi tru mot gia khac.
  const adultPrice = tour.pricing?.adult || tour.estimatedCost || 0;
  const childPrice = tour.pricing?.child ?? Math.round(adultPrice * CHILD_RATE);
  const infantPrice = tour.pricing?.infant ?? Math.round(adultPrice * INFANT_RATE);

  // Tiền tour, đã gồm lưu trú tiêu chuẩn
  const tourBaseCost = adultPrice * adults + childPrice * children + infantPrice * infants;

  // Phụ phí nâng hạng khách sạn: tính cho từng khách trả tiền phòng (người lớn + trẻ em)
  const tier = resolveHotelTier(tour, input.hotelId);
  const payingGuests = adults + children;
  const accommodationCost = tier ? (tier.surcharge || 0) * Math.max(1, Math.ceil(payingGuests / 2)) : 0;

  // Phí hướng dẫn viên riêng (nếu khách chọn người ngoài nhóm mặc định)
  const days = tour.durationDays || parseInt(String(tour.duration).match(/\d+/)?.[0] || '5', 10);
  const guideCost = input.guide?.pricing?.perDay
    ? input.guide.pricing.perDay * days
    : 0;

  const servicesCost = Math.max(0, parseFloat(input.servicesCost) || 0);

  const subtotal = tourBaseCost + accommodationCost + guideCost + servicesCost;

  return {
    adults, children, infants,
    adultPrice, childPrice, infantPrice,
    tourBaseCost,
    hotelTier: tier ? { level: tier.level, hotelName: tier.hotelName, surcharge: tier.surcharge } : null,
    accommodationCost,
    guideCost,
    servicesCost,
    subtotal
  };
}

module.exports = { calculateBookingPrice, resolveHotelTier, CHILD_RATE, INFANT_RATE };
