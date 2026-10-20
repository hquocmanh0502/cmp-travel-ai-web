const mongoose = require('mongoose');
const { CATEGORY_KEYS } = require('../config/poi-categories');
const { TOUR_THEMES } = require('../config/travel-vocabulary');

/**
 * Diem tham quan cua tung tour - nguyen lieu de SmartTour tu xep lich trinh
 * theo ngay (chon diem nao, thu tu nao, vua thoi gian moi ngay).
 *
 * Nguon: Wikidata (CC0), cung mot quy trinh cho ca 36 thanh pho.
 * Tai bang scripts/fetch-wikidata-pois.js, nap bang scripts/import-pois.js.
 *
 * Bo sung: OpenStreetMap (ODbL) cho chu de tour con < 2 diem Wikidata the hien
 * (bai bien Maldives, quan bar Phuket...), xem scripts/fetch-osm-pois.js.
 * Diem OSM co osmId; co them wikidataId neu OSM gan the wikidata.
 */
const poiSchema = new mongoose.Schema({
  tourId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour', required: true, index: true },
  city: { type: String, required: true },
  country: { type: String, required: true },

  wikidataId: String,
  osmId: String, // "node/123" | "way/456" - chi diem lay tu OpenStreetMap
  name: { type: String, required: true },
  description: String,

  category: { type: String, enum: CATEGORY_KEYS, required: true },
  // Suy tu category qua config/poi-categories.js - cung tu vung voi Tour.themes
  themes: [{ type: String, enum: TOUR_THEMES }],
  // Thoi gian tham quan dien hinh theo loai (bang co dinh, khong doan tung diem)
  visitMinutes: { type: Number, required: true, min: 1 },

  // GeoJSON de dung $near / 2dsphere khi tinh tuyen trong ngay
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  distanceFromCenterKm: Number,

  // Do noi tieng: so sitelinks tren Wikidata (so phien ban Wikipedia/... co bai)
  // rank = thu hang trong thanh pho, 1 = noi tieng nhat. Diem OSM: sitelinks 0,
  // xep sau moi diem Wikidata.
  popularity: {
    sitelinks: { type: Number, required: true },
    rank: { type: Number, required: true }
  },
  unesco: { type: Boolean, default: false },

  image: String,
  website: String,
  wikipediaUrl: String,
  wikivoyageUrl: String,

  source: {
    name: { type: String, enum: ['Wikidata', 'OpenStreetMap'], default: 'Wikidata' },
    license: { type: String, default: 'CC0 1.0' }, // OSM: 'ODbL 1.0'
    fetchedAt: Date
  }
}, { timestamps: true });

poiSchema.index({ tourId: 1, wikidataId: 1 }, { unique: true, partialFilterExpression: { wikidataId: { $type: 'string' } } });
poiSchema.index({ tourId: 1, osmId: 1 }, { unique: true, partialFilterExpression: { osmId: { $type: 'string' } } });
poiSchema.index({ location: '2dsphere' });
poiSchema.index({ tourId: 1, 'popularity.rank': 1 });

module.exports = mongoose.model('Poi', poiSchema);
