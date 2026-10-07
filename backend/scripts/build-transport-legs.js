/**
 * Sinh cac chang di chuyen giua cac tour tu TOA DO THAT.
 *
 * VAN DE TRUOC KHI CHAY:
 *   - Tour.transport chi co DUNG MOT "thanh pho ke tiep" gan co dinh, nen
 *     SmartTour khong ghep linh hoat nhieu diem den duoc.
 *   - Thoi gian di chuyen sai: Lauterbrunnen -> Milan ghi "di tau 1 gio".
 *     Khoang cach 160km thi dung (do duong chim bay), nhung tuyen duong sat qua
 *     nui thuc te mat khoang 4 gio. Bangkok -> Phuket ghi "695km di tau 6 gio",
 *     trong khi tuyen nay thuc te phai bay.
 *
 * CACH LAM:
 *   location.coordinates da co san du 36/36 tour (kem index 2dsphere), nen khong
 *   can nhap tay bang chang nao ca - tinh haversine cho MOI cap la xong, va con
 *   dung duoc cho phan dinh tuyen (TSP) cua SmartTour sau nay.
 *
 *   Phuong tien va thoi gian suy ra bang luat, ghi ro de giai trinh:
 *     - khac nhom duong sat, hoac > 900km            -> bay   : 2.5h + d/750
 *     - mot dau la diem den dao, > 250km             -> bay   : 2.5h + d/750
 *     - cung nuoc, <= 150km, khong co duong sat cao toc -> xe  : 0.5h + d/60
 *     - ca hai co duong sat cao toc, >= 200km        -> tau   : 0.75h + d/180
 *     - con lai trong cung nhom                      -> tau   : 0.5h + d/85
 *       (qua vung nui thi d/55, vi duong sat mien nui cham hon han)
 *     - hai diem den dao cung nuoc, <= 250km         -> pha   : 1.0h + d/35
 *
 *   Phan cong tren (2.5h bay, 0.75h tau) la thoi gian lam thu tuc / chuyen tau,
 *   neu bo di thi se lai ra ket qua "160km mat 1 gio" nhu du lieu cu.
 *
 * Chay (tu thu muc backend):
 *   node scripts/build-transport-legs.js --dry-run
 *   node scripts/build-transport-legs.js
 */

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Tour = require('../models/Tour');
const { CITY_PROFILES } = require('../config/city-profiles');

const dryRun = process.argv.includes('--dry-run');

const LEGS_PER_TOUR = 4;        // so chang luu cho moi tour
// Khong dat tran khoang cach: Maldives la diem den co lap, tour gan nhat cach
// hon 2700km. Neu cat theo nguong thi tour do khong co chang nao, va SmartTour
// se khong bao gio ghep duoc no vao hanh trinh.

// Gia ve uoc tinh theo km, dung de SmartTour tinh tong chi phi hanh trinh.
const COST_PER_KM = { train: 0.18, flight: 0.12, bus: 0.08, ferry: 0.15 };
const COST_BASE = { train: 5, flight: 60, bus: 2, ferry: 8 };

/** Khoang cach duong chim bay giua hai toa do [lng, lat], tinh bang km. */
function haversineKm([lng1, lat1], [lng2, lat2]) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Chon phuong tien va thoi gian cho mot chang. */
function resolveLeg(from, to, distanceKm) {
  const sameGroup = from.profile.railGroup === to.profile.railGroup;
  const sameCountry = from.country === to.country;
  const bothHsr = from.profile.hsr && to.profile.hsr;
  const bothIsland = from.profile.island && to.profile.island;

  // Hai diem den dao gan nhau trong cung nuoc -> di pha
  if (bothIsland && sameCountry && distanceKm <= 250) {
    return { mode: 'ferry', durationHours: 1.0 + distanceKm / 35 };
  }

  // Khac nhom duong sat, qua xa, hoac mot dau la diem den dao -> bay.
  //
  // Dieu kien dao rat quan trong: Bangkok -> Phuket 695km truoc day ra "di tau",
  // nhung tuyen nay khong co tau truc tiep, thuc te ai cung bay.
  const eitherIsland = from.profile.island || to.profile.island;
  if (!sameGroup || distanceKm > 900 || (eitherIsland && distanceKm > 250)) {
    return { mode: 'flight', durationHours: 2.5 + distanceKm / 750 };
  }

  // Chang ngan trong cung nuoc, khong co duong sat cao toc -> xe
  if (sameCountry && distanceKm <= 150 && !bothHsr) {
    return { mode: 'bus', durationHours: 0.5 + distanceKm / 60 };
  }

  // Duong sat qua vung nui: toc do thuc te thap hon han vi phai doi tau va duong
  // vong, va KHONG duoc huong toc do cao toc du hai dau deu co mang cao toc.
  // Day la ly do chang Lauterbrunnen -> Milan thuc su mat khoang 4 gio chu
  // khong phai 1 gio nhu du lieu cu ghi.
  const throughMountains = from.profile.themes.includes('mountain') ||
                           to.profile.themes.includes('mountain');
  if (throughMountains) {
    return { mode: 'train', durationHours: 0.5 + distanceKm / 55 };
  }

  // Duong sat cao toc
  if (bothHsr && distanceKm >= 200) {
    return { mode: 'train', durationHours: 0.75 + distanceKm / 180 };
  }

  // Duong sat thuong
  return { mode: 'train', durationHours: 0.5 + distanceKm / 85 };
}

const round1 = (v) => Math.round(v * 10) / 10;

(async () => {
  await connectDB();

  const tours = await Tour.find({});
  console.log(`Tim thay ${tours.length} tour.\n`);

  // Chuan bi danh sach diem co toa do va profile
  const nodes = [];
  const skipped = [];

  for (const tour of tours) {
    const coords = tour.location?.coordinates;
    const profile = CITY_PROFILES[tour.name];
    if (!coords || coords.length !== 2 || !profile) {
      skipped.push(tour.name);
      continue;
    }
    nodes.push({ tour, name: tour.name, country: tour.country, coords, profile });
  }

  if (skipped.length) console.log('Bo qua (thieu toa do hoac profile):', skipped.join(', '), '\n');

  const modeCount = {};
  let legTotal = 0;
  const speedWarnings = [];

  for (const from of nodes) {
    // Tinh khoang cach tu tour nay den tat ca tour khac
    const candidates = nodes
      .filter(to => to.name !== from.name)
      .map(to => {
        const distanceKm = haversineKm(from.coords, to.coords);
        return { to, distanceKm };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, LEGS_PER_TOUR);

    const legs = candidates.map(({ to, distanceKm }) => {
      const { mode, durationHours } = resolveLeg(from, to, distanceKm);
      const km = Math.round(distanceKm);
      const hours = round1(durationHours);

      // Tu kiem tra: toc do trung binh phai hop ly voi phuong tien
      const avgSpeed = km / hours;
      const limits = { bus: 90, train: 200, ferry: 60, flight: 900 };
      if (avgSpeed > limits[mode]) {
        speedWarnings.push(`${from.name} -> ${to.name}: ${km}km ${mode} ${hours}h = ${Math.round(avgSpeed)}km/h`);
      }

      modeCount[mode] = (modeCount[mode] || 0) + 1;
      legTotal++;

      return {
        toTourId: to.tour._id,
        toCity: to.name,
        toCountry: to.country,
        distanceKm: km,
        mode,
        durationHours: hours,
        estimatedCost: Math.round(COST_BASE[mode] + km * COST_PER_KM[mode])
      };
    });

    from.tour.transportLegs = legs;

    // Dong bo transport (mot chang) voi chang gan nhat, de du lieu cu khong
    // con mau thuan voi du lieu moi.
    if (legs.length) {
      const nearest = legs[0];
      from.tour.transport = {
        toNextCity: nearest.toCity,
        distanceKm: nearest.distanceKm,
        mode: nearest.mode,
        durationHours: nearest.durationHours
      };
    }

    if (!dryRun) await from.tour.save();
  }

  // ------------------------------- bao cao -------------------------------
  console.log(`Da sinh ${legTotal} chang (${LEGS_PER_TOUR} chang/tour).`);
  console.log('Phuong tien:', Object.entries(modeCount).map(([k, v]) => `${k} ${v}`).join(' | '));

  console.log('\n--- Kiem tra lai nhung chang tung bi sai ---');
  const check = (cityName) => {
    const node = nodes.find(x => x.name === cityName);
    if (!node) return;
    console.log(`\n${cityName}:`);
    node.tour.transportLegs.forEach(l => {
      console.log(`  -> ${l.toCity.padEnd(14)} ${String(l.distanceKm).padStart(5)}km  ${l.mode.padEnd(7)} ${String(l.durationHours).padStart(5)}h  ~$${l.estimatedCost}`);
    });
  };
  check('Lauterbrunnen');  // truoc day: Milan 160km train 1h
  check('Bangkok');        // truoc day: Phuket 695km train 6h
  check('Maldives');       // diem den dao xa, phai bay

  if (speedWarnings.length) {
    console.log('\nCANH BAO toc do phi thuc te:');
    speedWarnings.forEach(w => console.log('  ' + w));
  } else {
    console.log('\nKhong co chang nao co toc do trung binh phi thuc te.');
  }

  if (dryRun) console.log('\nDRY-RUN: chua ghi gi vao DB.');
  await mongoose.disconnect();
})().catch(err => {
  console.error('That bai:', err);
  process.exit(1);
});
