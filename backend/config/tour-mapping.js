// Smart mapping between user preferences and tour data
module.exports = {
  // Travel Style → Cost + Tags mapping
  travelStyle: {
    'luxury': {
      minCost: 4000,
      maxCost: 999999,
      tags: ['luxury', 'premium', '5-star', 'resort', 'exclusive'],
      difficulty: ['easy']
    },
    'budget': {
      minCost: 0,
      maxCost: 2000,
      tags: ['budget', 'backpacking', 'hostel', 'cheap', 'economical'],
      difficulty: ['easy', 'moderate']
    },
    'adventure': {
      tags: ['adventure', 'hiking', 'trekking', 'extreme', 'mountain', 'climbing', 'outdoor'],
      difficulty: ['moderate', 'challenging']
    },
    'cultural': {
      tags: ['culture', 'history', 'museum', 'heritage', 'temple', 'ancient', 'traditional'],
      difficulty: ['easy', 'moderate']
    },
    'relaxation': {
      tags: ['beach', 'spa', 'resort', 'relaxation', 'wellness', 'peaceful'],
      difficulty: ['easy']
    },
    'romance': {
      tags: ['romantic', 'honeymoon', 'couple', 'luxury', 'beach', 'sunset'],
      difficulty: ['easy']
    }
  },

  // Activities → Tags mapping
  activities: {
    'sightseeing': ['attractions', 'landmarks', 'tour', 'sightseeing', 'scenic', 'viewpoint'],
    'shopping': ['shopping', 'market', 'mall', 'boutique', 'bazaar'],
    'food': ['food', 'culinary', 'restaurant', 'cuisine', 'dining', 'gastronomy', 'local food'],
    'adventure': ['adventure', 'extreme', 'outdoor', 'sports'],
    'culture': ['culture', 'cultural', 'museum', 'history', 'heritage', 'temple'],
    'nightlife': ['nightlife', 'club', 'bar', 'entertainment', 'party'],
    'hiking': ['hiking', 'trekking', 'mountain', 'trail', 'walking'],
    'beach': ['beach', 'island', 'sea', 'ocean', 'coast', 'water'],
    'diving': ['diving', 'snorkeling', 'underwater', 'marine'],
    'photography': ['photography', 'scenic', 'landscape', 'viewpoint']
  },

  // Climate → Countries mapping
  climate: {
    'tropical': {
      countries: ['Thailand', 'Maldives', 'Bali', 'Indonesia', 'Vietnam', 'Philippines', 'Malaysia', 'Singapore'],
      tags: ['beach', 'island', 'hot', 'humid']
    },
    'temperate': {
      countries: ['Japan', 'Korea', 'South Korea', 'China', 'France', 'Italy', 'Spain', 'UK', 'Germany'],
      tags: ['mild', 'four-seasons', 'spring', 'autumn']
    },
    'cold': {
      countries: ['Iceland', 'Norway', 'Sweden', 'Finland', 'Canada', 'Switzerland', 'Russia', 'Alaska'],
      tags: ['snow', 'winter', 'ice', 'skiing', 'cold']
    },
    'desert': {
      countries: ['UAE', 'Dubai', 'Egypt', 'Morocco', 'Jordan', 'Arizona'],
      tags: ['desert', 'hot', 'dry', 'sand']
    }
  },

  // Accommodation Type → Hotel preferences
  accommodation: {
    'hotel': { minRating: 3, types: ['hotel', 'business hotel'] },
    'resort': { minRating: 4, types: ['resort', 'beach resort', 'spa resort'] },
    'hostel': { minRating: 2, types: ['hostel', 'backpacker'] },
    'apartment': { minRating: 3, types: ['apartment', 'serviced apartment', 'airbnb'] }
  },

  // Group Size → Tour capacity
  groupSize: {
    'solo': { minSize: 1, maxSize: 1, tags: ['solo', 'independent'] },
    'couple': { minSize: 2, maxSize: 2, tags: ['couple', 'romantic', 'honeymoon'] },
    'small': { minSize: 3, maxSize: 5, tags: ['small group', 'intimate'] },
    'medium': { minSize: 6, maxSize: 15, tags: ['group', 'social'] },
    'large': { minSize: 16, maxSize: 50, tags: ['large group', 'bus tour'] }
  },

  // Duration preferences
  duration: {
    'weekend': { minDays: 2, maxDays: 3 },
    'short': { minDays: 4, maxDays: 5 },
    'week': { minDays: 6, maxDays: 8 },
    'long': { minDays: 9, maxDays: 14 },
    'extended': { minDays: 15, maxDays: 999 }
  },

  // Best time to visit → Months
  seasons: {
    'spring': [3, 4, 5],
    'summer': [6, 7, 8],
    'autumn': [9, 10, 11],
    'winter': [12, 1, 2]
  }
};
