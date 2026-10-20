// backend/services/departureService.js
//
// Moi thao tac voi CHUYEN KHOI HANH (Tour.availability) di qua day:
// tim chuyen theo ngay, giu cho khi dat, tra cho khi huy, tinh lai so cho.
//
// Truoc day booking luu ngay tu do khach chon tren lich, khong gan voi chuyen
// nao (0/227 booking khop) va availableSlots khong bao gio bi tru -> ban qua cho.

const Tour = require('../models/Tour');
const { calendarDay } = require('./seasonalPricing');

/** So ghe mot booking chiem: nguoi lon + tre em. Em be ngoi long, khong tinh ghe. */
const seatsFor = (b) => (parseInt(b.adults) || 0) + (parseInt(b.children) || 0);

/** Chuyen khoi hanh dung ngay (theo lich) - null neu ngay do khong co chuyen. */
function findDeparture(tour, date) {
  if (!date || Number.isNaN(new Date(date).getTime())) return null;
  const day = calendarDay(date);
  return (tour.availability || []).find(a => calendarDay(a.startDate) === day) || null;
}

/** Cac chuyen sap toi con du cho, de goi y khi khach chon ngay khong co chuyen. */
function upcomingDepartures(tour, { from = new Date(), seats = 1, limit = 5 } = {}) {
  return (tour.availability || [])
    .filter(a => new Date(a.startDate) > from && (a.availableSlots || 0) >= seats)
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .slice(0, limit)
    .map(a => ({
      departureId: a._id,
      startDate: calendarDay(a.startDate),
      endDate: calendarDay(a.endDate),
      price: a.price,
      availableSlots: a.availableSlots
    }));
}

/**
 * Giu `seats` cho tren mot chuyen - NGUYEN TU: chi tru khi con du cho, nen hai
 * nguoi dat cung luc khong the cung lay cho cuoi cung.
 * @returns {Promise<boolean>} false neu khong du cho
 */
async function reserveSeats(tourId, departureId, seats) {
  const res = await Tour.updateOne(
    { _id: tourId, availability: { $elemMatch: { _id: departureId, availableSlots: { $gte: seats } } } },
    { $inc: { 'availability.$.availableSlots': -seats } }
  );
  return res.modifiedCount === 1;
}

/** Tra cho khi booking bi huy (hoac luu booking that bai sau khi da giu cho). */
async function releaseSeats(tourId, departureId, seats) {
  if (!tourId || !departureId || !seats) return;
  await Tour.updateOne(
    { _id: tourId, 'availability._id': departureId },
    { $inc: { 'availability.$.availableSlots': seats } }
  );
}

/** Tra cho cua mot booking vua chuyen sang 'cancelled' (bo qua booking cu khong gan chuyen). */
async function releaseForBooking(booking) {
  if (!booking?.departureId) return;
  await releaseSeats(booking.tourId?._id || booking.tourId, booking.departureId, seatsFor(booking));
}

module.exports = { seatsFor, findDeparture, upcomingDepartures, reserveSeats, releaseSeats, releaseForBooking };
