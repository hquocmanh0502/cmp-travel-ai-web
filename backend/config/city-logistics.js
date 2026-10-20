/**
 * HAU CAN CHO 36 THANH PHO: mui gio, san bay, ga/ben, thoi gian ra trung tam.
 *
 * Phuc vu SmartTour tinh GIO DEN NOI khi noi hai tour:
 *   gio den KS tour B = gio tra phong KS tour A (gio dia phuong A)
 *                     + phut tu trung tam A ra san bay/ga (transferMinutes)
 *                     + thoi gian chang (Tour.transportLegs, tinh tu cua ra/ga)
 *                     + phut tu san bay/ga B ve trung tam
 *                     -> doi sang gio dia phuong B bang timezone
 *
 * timezone: ten IANA ("Europe/Paris"), KHONG ghi "+1". Nhieu nuoc doi gio theo
 *   mua (Paris +1 mua dong, +2 mua he); ghi so co dinh se sai nua nam.
 *   Canada co nhieu mui gio nen ghi theo THANH PHO, khong theo nuoc.
 *
 * airport: san bay quoc te khach thuc te dung. Diem den khong co san bay lon thi
 *   lay san bay gan nhat ma cac hang quoc te bay toi (Malacca -> KUL,
 *   Lauterbrunnen -> ZRH, Kyoto -> KIX) - vi vay transferMinutes co the lon.
 *
 * ground: ga tau / ben xe / ben pha chinh, dung cho chang di bang mat dat hoac
 *   pha. null neu thanh pho khong co (vd Phuket khong co duong sat).
 *
 * transferMinutes la thoi gian DIEN HINH tu trung tam bang phuong tien cong cong
 * nhanh nhat hoac taxi, khong tinh tac duong - so uoc luong, lam tron 5 phut.
 * Cung mot cach uoc luong cho moi thanh pho.
 */

const CITY_LOGISTICS = {
  // --- Anh ---
  London:        { timezone: 'Europe/London',      airport: { iata: 'LHR', name: 'London Heathrow', transferMinutes: 50 },
                   ground: { name: 'London St Pancras International', type: 'rail', transferMinutes: 15 } },
  Manchester:    { timezone: 'Europe/London',      airport: { iata: 'MAN', name: 'Manchester Airport', transferMinutes: 25 },
                   ground: { name: 'Manchester Piccadilly', type: 'rail', transferMinutes: 10 } },
  // --- Phap ---
  Paris:         { timezone: 'Europe/Paris',       airport: { iata: 'CDG', name: 'Paris Charles de Gaulle', transferMinutes: 50 },
                   ground: { name: 'Paris Gare de Lyon', type: 'rail', transferMinutes: 15 } },
  Lyon:          { timezone: 'Europe/Paris',       airport: { iata: 'LYS', name: 'Lyon Saint-Exupéry', transferMinutes: 35 },
                   ground: { name: 'Lyon Part-Dieu', type: 'rail', transferMinutes: 10 } },
  Marseille:     { timezone: 'Europe/Paris',       airport: { iata: 'MRS', name: 'Marseille Provence', transferMinutes: 30 },
                   ground: { name: 'Marseille Saint-Charles', type: 'rail', transferMinutes: 10 } },
  Bordeaux:      { timezone: 'Europe/Paris',       airport: { iata: 'BOD', name: 'Bordeaux-Mérignac', transferMinutes: 35 },
                   ground: { name: 'Bordeaux Saint-Jean', type: 'rail', transferMinutes: 10 } },
  // --- Y ---
  Rome:          { timezone: 'Europe/Rome',        airport: { iata: 'FCO', name: 'Rome Fiumicino', transferMinutes: 40 },
                   ground: { name: 'Roma Termini', type: 'rail', transferMinutes: 10 } },
  Florence:      { timezone: 'Europe/Rome',        airport: { iata: 'FLR', name: 'Florence Peretola', transferMinutes: 25 },
                   ground: { name: 'Firenze Santa Maria Novella', type: 'rail', transferMinutes: 10 } },
  Venice:        { timezone: 'Europe/Rome',        airport: { iata: 'VCE', name: 'Venice Marco Polo', transferMinutes: 30 },
                   ground: { name: 'Venezia Santa Lucia', type: 'rail', transferMinutes: 10 } },
  Milan:         { timezone: 'Europe/Rome',        airport: { iata: 'MXP', name: 'Milan Malpensa', transferMinutes: 50 },
                   ground: { name: 'Milano Centrale', type: 'rail', transferMinutes: 10 } },
  // --- Tay Ban Nha / Bo Dao Nha ---
  Barcelona:     { timezone: 'Europe/Madrid',      airport: { iata: 'BCN', name: 'Barcelona El Prat', transferMinutes: 30 },
                   ground: { name: 'Barcelona Sants', type: 'rail', transferMinutes: 15 } },
  Valencia:      { timezone: 'Europe/Madrid',      airport: { iata: 'VLC', name: 'Valencia Airport', transferMinutes: 25 },
                   ground: { name: 'Valencia Joaquín Sorolla', type: 'rail', transferMinutes: 15 } },
  Lisbon:        { timezone: 'Europe/Lisbon',      airport: { iata: 'LIS', name: 'Lisbon Humberto Delgado', transferMinutes: 25 },
                   ground: { name: 'Lisboa Oriente', type: 'rail', transferMinutes: 20 } },
  Porto:         { timezone: 'Europe/Lisbon',      airport: { iata: 'OPO', name: 'Porto Francisco Sá Carneiro', transferMinutes: 30 },
                   ground: { name: 'Porto Campanhã', type: 'rail', transferMinutes: 15 } },
  // --- Trung Au ---
  Berlin:        { timezone: 'Europe/Berlin',      airport: { iata: 'BER', name: 'Berlin Brandenburg', transferMinutes: 40 },
                   ground: { name: 'Berlin Hauptbahnhof', type: 'rail', transferMinutes: 15 } },
  Munich:        { timezone: 'Europe/Berlin',      airport: { iata: 'MUC', name: 'Munich Airport', transferMinutes: 45 },
                   ground: { name: 'München Hauptbahnhof', type: 'rail', transferMinutes: 10 } },
  Amsterdam:     { timezone: 'Europe/Amsterdam',   airport: { iata: 'AMS', name: 'Amsterdam Schiphol', transferMinutes: 25 },
                   ground: { name: 'Amsterdam Centraal', type: 'rail', transferMinutes: 10 } },
  Lauterbrunnen: { timezone: 'Europe/Zurich',      airport: { iata: 'ZRH', name: 'Zurich Airport', transferMinutes: 150 },
                   ground: { name: 'Lauterbrunnen station', type: 'rail', transferMinutes: 5 } },
  // --- Hy Lap ---
  Athens:        { timezone: 'Europe/Athens',      airport: { iata: 'ATH', name: 'Athens International', transferMinutes: 45 },
                   ground: { name: 'Athens Central Station', type: 'rail', transferMinutes: 15 } },
  Santorini:     { timezone: 'Europe/Athens',      airport: { iata: 'JTR', name: 'Santorini (Thira) Airport', transferMinutes: 15 },
                   ground: { name: 'Athinios Port', type: 'ferry', transferMinutes: 25 } },
  // --- Nga ---
  Moscow:        { timezone: 'Europe/Moscow',      airport: { iata: 'SVO', name: 'Moscow Sheremetyevo', transferMinutes: 45 },
                   ground: { name: 'Moscow Kazansky station', type: 'rail', transferMinutes: 20 } },
  Kazan:         { timezone: 'Europe/Moscow',      airport: { iata: 'KZN', name: 'Kazan International', transferMinutes: 35 },
                   ground: { name: 'Kazan Passenger Station', type: 'rail', transferMinutes: 10 } },
  // --- Chau A ---
  Tokyo:         { timezone: 'Asia/Tokyo',         airport: { iata: 'HND', name: 'Tokyo Haneda', transferMinutes: 35 },
                   ground: { name: 'Tokyo Station', type: 'rail', transferMinutes: 15 } },
  Osaka:         { timezone: 'Asia/Tokyo',         airport: { iata: 'KIX', name: 'Kansai International', transferMinutes: 60 },
                   ground: { name: 'Shin-Osaka Station', type: 'rail', transferMinutes: 20 } },
  Kyoto:         { timezone: 'Asia/Tokyo',         airport: { iata: 'KIX', name: 'Kansai International', transferMinutes: 80 },
                   ground: { name: 'Kyoto Station', type: 'rail', transferMinutes: 10 } },
  'Causeway Bay': { timezone: 'Asia/Hong_Kong',    airport: { iata: 'HKG', name: 'Hong Kong International', transferMinutes: 45 },
                   ground: { name: 'Hong Kong West Kowloon Station', type: 'rail', transferMinutes: 25 } },
  Bangkok:       { timezone: 'Asia/Bangkok',       airport: { iata: 'BKK', name: 'Bangkok Suvarnabhumi', transferMinutes: 45 },
                   ground: { name: 'Krung Thep Aphiwat Central Terminal', type: 'rail', transferMinutes: 25 } },
  Phuket:        { timezone: 'Asia/Bangkok',       airport: { iata: 'HKT', name: 'Phuket International', transferMinutes: 45 },
                   ground: null },
  'Kuala Lumpur': { timezone: 'Asia/Kuala_Lumpur', airport: { iata: 'KUL', name: 'Kuala Lumpur International', transferMinutes: 55 },
                   ground: { name: 'KL Sentral', type: 'rail', transferMinutes: 10 } },
  Malacca:       { timezone: 'Asia/Kuala_Lumpur',  airport: { iata: 'KUL', name: 'Kuala Lumpur International', transferMinutes: 120 },
                   ground: { name: 'Melaka Sentral bus terminal', type: 'bus', transferMinutes: 15 } },
  Langkawi:      { timezone: 'Asia/Kuala_Lumpur',  airport: { iata: 'LGK', name: 'Langkawi International', transferMinutes: 20 },
                   ground: { name: 'Kuah Jetty', type: 'ferry', transferMinutes: 15 } },
  Delhi:         { timezone: 'Asia/Kolkata',       airport: { iata: 'DEL', name: 'Indira Gandhi International', transferMinutes: 40 },
                   ground: { name: 'New Delhi Railway Station', type: 'rail', transferMinutes: 20 } },
  Maldives:      { timezone: 'Indian/Maldives',    airport: { iata: 'MLE', name: 'Velana International', transferMinutes: 15 },
                   ground: null },
  // --- Canada ---
  Toronto:       { timezone: 'America/Toronto',    airport: { iata: 'YYZ', name: 'Toronto Pearson', transferMinutes: 35 },
                   ground: { name: 'Toronto Union Station', type: 'rail', transferMinutes: 10 } },
  Montreal:      { timezone: 'America/Toronto',    airport: { iata: 'YUL', name: 'Montréal-Trudeau', transferMinutes: 35 },
                   ground: { name: 'Montréal Gare Centrale', type: 'rail', transferMinutes: 10 } },
  Vancouver:     { timezone: 'America/Vancouver',  airport: { iata: 'YVR', name: 'Vancouver International', transferMinutes: 30 },
                   ground: { name: 'Vancouver Pacific Central Station', type: 'rail', transferMinutes: 15 } }
};

/**
 * Quy dinh van hanh CHUNG cua cong ty cho moi tour (gio dia phuong).
 * Dat o DB tung tour (Tour.operations) de sau nay chinh rieng duoc, nhung hien
 * moi tour dung cung mot quy dinh - khong co tour nao duoc uu ai.
 *
 *   arrivalPickup     : ngay 1, xe don tai san bay/ga trong khung gio nay
 *   welcomeMeeting    : buoi gap doan + phat lich, toi ngay 1
 *   departureTransfer : ngay cuoi, xe tien ra san bay/ga trong khung gio nay
 *   latestArrival     : moc den KS muon nhat de con tinh la "den trong ngay"
 *                       khi noi hai tour (sau moc nay phai them dem noi chuyen)
 */
const DEFAULT_OPERATIONS = {
  arrivalPickup: { from: '08:00', to: '20:00' },
  welcomeMeeting: '18:30',
  departureTransfer: { from: '06:00', to: '20:00' },
  latestArrival: '21:00'
};

// Gio nhan/tra phong dung khi khach san KHONG co du lieu rieng: lay theo gia tri
// pho bien nhat trong chinh DB (64/75 khach san co du lieu la 14:00 / 12:00).
const DEFAULT_CHECK_TIMES = { checkInTime: '14:00', checkOutTime: '12:00' };

module.exports = { CITY_LOGISTICS, DEFAULT_OPERATIONS, DEFAULT_CHECK_TIMES };
