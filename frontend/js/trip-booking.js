// Dat ca chuyen ghep (SmartTour): dua chuyen da chon sang trang reservation.
// Dung chung cho trang Smart Tour (smart-tour.js) va khung chat (chatbot.js) -
// mot cau truc pendingBooking duy nhat ma reservation.js doc.
//
// plan  = { stops:[{tourId,name,startDay,endDay,cost,hotel}], connections:[{mode,to,arriveDay,arriveAt,connectionNights,cost}],
//           totalDays, startDay, endDay, totalCost }
// party = { adults, children, infants } (da chuan hoa: tre 12+ tinh nguoi lon)
(function () {
  function toReservation(plan, party) {
    sessionStorage.setItem('pendingBooking', JSON.stringify({
      tourId: plan.stops[0].tourId,
      tourName: plan.stops.map(s => s.name).join(' → '),
      tourDuration: `${plan.totalDays} days`,
      selectedHotel: { id: null, name: plan.stops.map(s => s.hotel || 'Standard hotel').join(' · '), surcharge: 0 },
      selectedGuide: null,
      checkinDate: plan.startDay,
      checkoutDate: plan.endDay,
      adults: party.adults,
      children: party.children,
      // Gia tham khao (chua tru VIP); server tinh lai khi dat
      totalPrice: plan.totalCost,
      trip: {
        // tourId + startDay gui len server; phan con lai chi de hien tren trang dat
        stops: plan.stops.map(s => ({
          tourId: s.tourId, startDay: s.startDay, name: s.name, endDay: s.endDay, cost: s.cost, hotel: s.hotel
        })),
        connections: (plan.connections || []).map(c => ({
          mode: c.mode, to: c.to, arriveDay: c.arriveDay, arriveAt: c.arriveAt,
          connectionNights: c.connectionNights, cost: c.cost
        })),
        infants: party.infants || 0
      },
      timestamp: new Date().toISOString()
    }));
    window.location.href = 'reservation.html?v=' + Date.now();
  }

  window.CMPTripBooking = { toReservation };
})();
