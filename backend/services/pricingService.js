// backend/services/pricingService.js
//
// Nơi DUY NHẤT tính giá một booking.
//
// Mô hình giá:
//   Giá người lớn THEO NGÀY KHỞI HÀNH (mùa cao/thấp điểm), xem services/seasonalPricing.js.
//   Giá trẻ em / em bé giữ đúng tỉ lệ với giá người lớn của tour.
//   Giá tour đã bao gồm khách sạn TIÊU CHUẨN (hạng rẻ nhất trong tour.hotelTiers).
//   Chọn khách sạn cao hơn thì trả thêm phụ phí (surcharge) cho cả chuyến.
//   Chọn phòng chỉ để kiểm tra sức chứa, KHÔNG tính tiền theo phòng - nếu tính
//   sẽ trùng với phần lưu trú vốn đã nằm trong giá tour.
//
// Trước đây backend nhận thẳng totalAmount và accommodationCost do client gửi lên,
// nghĩa là sửa request là đặt tour giá 0 đồng. Giờ mọi con số đều tính lại ở đây.

// Khung tuổi tính giá - NƠI DUY NHẤT định nghĩa, form đặt tour / SmartTour hỏi
// tuổi từng trẻ rồi xếp vào đây. Tuổi tính tại NGÀY KHỞI HÀNH.
//   infant: 0-1 tuổi   - ngồi lòng, không chiếm ghế (departureService.seatsFor)
//   child : 2-11 tuổi  - giá trẻ em, chiếm ghế
//   adult : từ 12 tuổi - giá người lớn
// Tour.minAge (6 tour từ 6 tuổi, Lauterbrunnen từ 12) phải so với tuổi trẻ nhỏ
// nhất trong đoàn, nên form PHẢI hỏi tuổi chứ không chỉ hỏi số lượng.
const AGE_BANDS = {
  infant: { minAge: 0, maxAge: 1 },
  child: { minAge: 2, maxAge: 11 },
  adult: { minAge: 12, maxAge: Infinity }
};

/** Xếp một tuổi vào khung giá: 'infant' | 'child' | 'adult'. */
function ageBand(age) {
  const a = Number(age);
  if (a <= AGE_BANDS.infant.maxAge) return 'infant';
  if (a <= AGE_BANDS.child.maxAge) return 'child';
  return 'adult';
}

const CHILD_RATE = 0.7;   // trẻ em trả 70% giá người lớn
const INFANT_RATE = 0.1;  // em bé trả 10%

const { priceForDeparture } = require('./seasonalPricing');

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
 * @param {object} input  { adults, children, infants, hotelId, guide, servicesCost, departureDate }
 * @returns {object} chi tiết từng khoản + tổng trước giảm giá
 */
function calculateBookingPrice(tour, input = {}) {
  const adults = Math.max(1, parseInt(input.adults) || 1);
  const children = Math.max(0, parseInt(input.children) || 0);
  const infants = Math.max(0, parseInt(input.infants) || 0);

  // Gia nguoi lon theo NGAY KHOI HANH, cung cong thuc da sinh availability[].price.
  //
  // Truoc day noi nay luon dung pricing.adult (gia co ban), trong khi
  // availability[].price co he so mua (+20% chinh mua, -15% thap diem). Khach
  // thay "Paris khoi hanh 3/12 gia $5,950" nhung bi tru $7,000.
  const basePrice = tour.pricing?.adult || tour.estimatedCost || 0;
  const season = priceForDeparture(tour, input.departureDate);
  const adultPrice = season.adultPrice;
  // Tre em / em be giu dung ti le voi gia nguoi lon cua tour
  const ratio = basePrice ? adultPrice / basePrice : 1;
  const childPrice = tour.pricing?.child != null
    ? Math.round(tour.pricing.child * ratio)
    : Math.round(adultPrice * CHILD_RATE);
  const infantPrice = tour.pricing?.infant != null
    ? Math.round(tour.pricing.infant * ratio)
    : Math.round(adultPrice * INFANT_RATE);

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
    basePrice, adultPrice, childPrice, infantPrice,
    season: season.season,
    // Chuyen trong lich trung ngay khach chon (null = ngay tu chon ngoai lich)
    scheduledDeparture: season.departure
      ? { startDate: season.departure.startDate, availableSlots: season.departure.availableSlots }
      : null,
    tourBaseCost,
    hotelTier: tier ? { level: tier.level, hotelName: tier.hotelName, surcharge: tier.surcharge } : null,
    accommodationCost,
    guideCost,
    servicesCost,
    subtotal
  };
}

module.exports = { calculateBookingPrice, resolveHotelTier, CHILD_RATE, INFANT_RATE, AGE_BANDS, ageBand };
