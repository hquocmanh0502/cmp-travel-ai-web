const mongoose = require('mongoose');
const path = require('path');
const Tour = require('../models/Tour');

// Hardcode MongoDB URI for this script
const MONGODB_URI = 'mongodb+srv://hoangquocmanh2004_db_user:NuB0wKG7gc3QiGn0@cluster0.gs9owka.mongodb.net/traveldb?retryWrites=true&w=majority';

// Unsplash images by category and country
const galleryImagesByCountry = {
  'Maldives': {
    attractions: [
      'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800',
      'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=800',
      'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=800'
    ],
    accommodation: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'
    ],
    activities: [
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
      'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
      'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800'
    ],
    food: [
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800'
    ],
    landscape: [
      'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800',
      'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=800',
      'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=800'
    ]
  },
  'Thailand': {
    attractions: [
      'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800',
      'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800',
      'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=800'
    ],
    accommodation: [
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800',
      'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800'
    ],
    activities: [
      'https://images.unsplash.com/photo-1537519646099-335be2db3b1b?w=800',
      'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
      'https://images.unsplash.com/photo-1588179568925-1a7e6d4a1c46?w=800'
    ],
    food: [
      'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=800',
      'https://images.unsplash.com/photo-1569562211093-4ed0d0758f12?w=800',
      'https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=800'
    ],
    landscape: [
      'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800',
      'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800',
      'https://images.unsplash.com/photo-1506665531195-3566af2b4dfa?w=800'
    ]
  },
  'Japan': {
    attractions: [
      'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800',
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800',
      'https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=800'
    ],
    accommodation: [
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800'
    ],
    activities: [
      'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800',
      'https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?w=800',
      'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=800'
    ],
    food: [
      'https://images.unsplash.com/photo-1555126634-323283e090fa?w=800',
      'https://images.unsplash.com/photo-1583623025817-d180a2221d0a?w=800',
      'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800'
    ],
    landscape: [
      'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800',
      'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800',
      'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800'
    ]
  },
  'France': {
    attractions: [
      'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=800',
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
      'https://images.unsplash.com/photo-1549144511-f099e773c147?w=800'
    ],
    accommodation: [
      'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800',
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800'
    ],
    activities: [
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
      'https://images.unsplash.com/photo-1569949381669-ecf31ae8e613?w=800',
      'https://images.unsplash.com/photo-1549144511-f099e773c147?w=800'
    ],
    food: [
      'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800',
      'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800',
      'https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=800'
    ],
    landscape: [
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
      'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=800',
      'https://images.unsplash.com/photo-1549144511-f099e773c147?w=800'
    ]
  }
};

// Default images for countries not in the list
const defaultGallery = {
  attractions: [
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800',
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800',
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800'
  ],
  accommodation: [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800'
  ],
  activities: [
    'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=800',
    'https://images.unsplash.com/photo-1533130061792-64b345e4a833?w=800',
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800'
  ],
  food: [
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800'
  ],
  landscape: [
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800',
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800'
  ]
};

async function addGalleryToTours() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const tours = await Tour.find({});
    console.log(`📊 Found ${tours.length} tours`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const tour of tours) {
      // Skip if tour already has enough gallery images (more than 10)
      if (tour.gallery && tour.gallery.length >= 10) {
        console.log(`⏭️  Skipping ${tour.name} - already has sufficient gallery (${tour.gallery.length} images)`);
        skippedCount++;
        continue;
      }

      // Get images for this country or use default
      const countryImages = galleryImagesByCountry[tour.country] || defaultGallery;
      
      // Build gallery array
      const gallery = [];
      
      // Add tour main image to gallery
      if (tour.img) {
        gallery.push({
          url: tour.img,
          category: 'all',
          caption: `${tour.name} - Main view`
        });
      }

      // Add category images
      Object.keys(countryImages).forEach(category => {
        countryImages[category].forEach((url, index) => {
          gallery.push({
            url: url,
            category: category,
            caption: `${tour.name} - ${category} ${index + 1}`
          });
        });
      });

      // Update tour with gallery
      tour.gallery = gallery;
      await tour.save();

      console.log(`✅ Added ${gallery.length} gallery images to ${tour.name} (${tour.country})`);
      updatedCount++;
    }

    console.log('\n🎉 Summary:');
    console.log(`✅ Updated: ${updatedCount} tours`);
    console.log(`⏭️  Skipped: ${skippedCount} tours (already have gallery)`);

    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addGalleryToTours();
