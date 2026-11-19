// backend/services/refundService.js
//
// Huy booking + hoan tien vao vi CMP. Moi duong huy (khach tren web, admin)
// deu di qua day de cung mot luat.
//
// LUAT HOAN TIEN (chi booking da tra bang vi CMP):
//   khach huy, con >= 30 ngay truoc khoi hanh -> hoan 100%
//   khach huy, con 14-29 ngay                 -> hoan 50%
//   khach huy, con < 14 ngay                  -> khong hoan
//   admin huy (loi phia cong ty)              -> luon hoan 100%
// Booking chua tra / tra ngoai vi (tien mat, chuyen khoan) khong hoan tu dong.

const Booking = require('../models/Booking');
const User = require('../models/User');
const { releaseForBooking } = require('./departureService');
const { recordSpend } = require('./vipService');

const DAY_MS = 864e5;
const REFUND_STEPS = [[30, 1], [14, 0.5], [0, 0]];

/** Ti le hoan theo so ngay con lai truoc khoi hanh (khach tu huy). */
function refundRate(departureDate, now = new Date()) {
  const daysLeft = Math.floor((new Date(departureDate) - now) / DAY_MS);
  return REFUND_STEPS.find(([min]) => daysLeft >= min)?.[1] ?? 0;
}

/** Booking nay co duoc tra bang vi khong (ca booking cu truoc khi luu paymentMethod). */
async function paidByWallet(booking) {
  if (booking.paymentStatus !== 'paid') return false;
  if (booking.paymentMethod === 'cmp_wallet') return true;
  const refs = [String(booking._id), booking.tripId].filter(Boolean);
  return !!(await User.exists({
    _id: booking.userId,
    'wallet.transactions': { $elemMatch: { type: 'payment', reference: { $in: refs } } }
  }));
}

/**
 * Huy booking, tra ghe, hoan tien (neu co). Nguyen tu: hai request huy cung luc
 * chi mot request duoc xu ly -> khong hoan tien hai lan.
 *
 * @returns {Promise<{ booking, refundAmount, refundRate } | null>} null neu da huy tu truoc
 */
async function cancelAndRefund(bookingId, { byAdmin = false, reason } = {}) {
  const booking = await Booking.findOneAndUpdate(
    { _id: bookingId, status: { $ne: 'cancelled' } },
    {
      $set: {
        status: 'cancelled',
        cancellationDate: new Date(),
        cancellationReason: reason || (byAdmin ? 'Cancelled by admin' : 'User requested cancellation')
      }
    },
    { new: true }
  );
  if (!booking) return null;
  await releaseForBooking(booking);

  let rate = 0;
  let refundAmount = 0;
  if (await paidByWallet(booking)) {
    rate = byAdmin ? 1 : refundRate(booking.departureDate);
    refundAmount = Math.round((booking.totalAmount || 0) * rate * 100) / 100;
  }

  if (refundAmount > 0) {
    await User.updateOne({ _id: booking.userId }, {
      $inc: { 'wallet.balance': refundAmount },
      $push: {
        'wallet.transactions': {
          type: 'refund',
          amount: refundAmount,
          description: `Refund ${Math.round(rate * 100)}% for cancelled booking: ${booking.tourName || 'Tour'}`,
          reference: String(booking._id),
          status: 'completed',
          date: new Date(),
          completedAt: new Date()
        }
      }
    });
    // updateOne thay vi save(): hook pre-save kiem tra so phong se chan booking cu
    await Booking.updateOne({ _id: booking._id }, {
      $set: {
        paymentStatus: 'refunded',
        'paymentDetails.paymentNote': `Refunded $${refundAmount} (${Math.round(rate * 100)}%)`
      }
    });
    booking.paymentStatus = 'refunded';
    // Chi tru lai chi tieu VIP cho booking da duoc CONG luc tra (tra vi tu ban
    // nay tro di); booking vi cu chua tung duoc cong. Phan khong hoan van tinh la da chi.
    if (booking.paymentMethod === 'cmp_wallet') await recordSpend(booking.userId, -refundAmount, rate === 1 ? -1 : 0);
  }

  return { booking, refundAmount, refundRate: rate };
}

module.exports = { cancelAndRefund, refundRate, REFUND_STEPS };
