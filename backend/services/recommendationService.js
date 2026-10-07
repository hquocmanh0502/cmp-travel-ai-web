// backend/services/recommendationService.js
const Tour = require('../models/Tour');
const User = require('../models/User');
const tourMapping = require('../config/tour-mapping');
const {
  stylesToThemes,
  activitiesToThemes,
  normalizeStyle,
  normalizeActivity,
  climateOf
} = require('../config/travel-vocabulary');

/** Ty le trung nhau giua hai tap (Jaccard). Tra 0 khi mot ben rong. */
function jaccard(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  if (!setA.size || !setB.size) return 0;
  let inter = 0;
  for (const v of setA) if (setB.has(v)) inter++;
  return inter / (setA.size + setB.size - inter);
}

/** Ty le cac chu de nguoi dung muon ma tour co (recall, khong doi xung). */
function coverage(wanted, available) {
  const have = new Set(available);
  const want = [...new Set(wanted)];
  if (!want.length) return 0;
  return want.filter(w => have.has(w)).length / want.length;
}

class RecommendationService {
  /**
   * Generate personalized tour recommendations
   */
  async generateRecommendations(userId, options = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      console.log('🎯 Generating recommendations for:', user.username);
      console.log('📋 User preferences:', JSON.stringify(user.preferences, null, 2));

      // Get all active tours
      const allTours = await Tour.find({ status: 'active' });
      console.log(`📊 Found ${allTours.length} active tours`);

      // Calculate score for each tour
      const scoredTours = allTours.map(tour => {
        const score = this.calculateTourScore(tour, user);
        return {
          tour: tour,
          score: score.totalScore,
          scoreBreakdown: score.breakdown,
          matchPercentage: Math.round(score.totalScore * 100),
          reasons: this.generateReasons(score.breakdown, tour)
        };
      });

      // Sort by score (highest first)
      scoredTours.sort((a, b) => b.score - a.score);

      // Get top recommendations
      const limit = options.limit || 20;
      const recommendations = scoredTours.slice(0, limit);

      console.log(`✅ Generated ${recommendations.length} recommendations`);
      console.log('🏆 Top 3 scores:', recommendations.slice(0, 3).map(r => 
        `${r.tour.name}: ${r.matchPercentage}%`
      ));

      return recommendations;

    } catch (error) {
      console.error('❌ Error generating recommendations:', error);
      throw error;
    }
  }

  /**
   * Calculate match score for a tour
   */
  calculateTourScore(tour, user) {
    const breakdown = {};
    let totalScore = 0;

    const prefs = user.preferences || {};

    // 1. BUDGET MATCH (25%)
    breakdown.budget = this.calculateBudgetMatch(tour, prefs.budgetRange);
    totalScore += breakdown.budget * 0.25;

    // 2. TRAVEL STYLE MATCH (20%)
    breakdown.travelStyle = this.calculateStyleMatch(tour, prefs.travelStyle);
    totalScore += breakdown.travelStyle * 0.20;

    // 3. ACTIVITIES MATCH (15%)
    breakdown.activities = this.calculateActivityMatch(tour, prefs.activities);
    totalScore += breakdown.activities * 0.15;

    // 4. COUNTRY/DESTINATION MATCH (15%)
    breakdown.country = this.calculateCountryMatch(tour, prefs.favoriteCountries);
    totalScore += breakdown.country * 0.15;

    // 5. CLIMATE MATCH (10%)
    breakdown.climate = this.calculateClimateMatch(tour, prefs.climatePreference);
    totalScore += breakdown.climate * 0.10;

    // 6. BEHAVIOR MATCH (5%)
    breakdown.behavior = this.calculateBehaviorMatch(tour, user.behavior);
    totalScore += breakdown.behavior * 0.05;

    // 7. POPULARITY BOOST (5%)
    breakdown.popularity = this.calculatePopularityScore(tour);
    totalScore += breakdown.popularity * 0.05;

    // 8. RATING BOOST (3%)
    breakdown.rating = tour.rating / 5;
    totalScore += breakdown.rating * 0.03;

    // 9. DIVERSITY FACTOR (2%)
    breakdown.diversity = 0.5; // Placeholder
    totalScore += breakdown.diversity * 0.02;

    return {
      totalScore: Math.min(totalScore, 1.0), // Cap at 1.0
      breakdown
    };
  }

  /**
   * Budget matching
   */
  calculateBudgetMatch(tour, budgetRange) {
    if (!budgetRange || !budgetRange.min || !budgetRange.max) {
      return 0.5; // Neutral if no preference
    }

    const tourCost = tour.estimatedCost || tour.pricing?.adult || 0;
    const { min, max } = budgetRange;

    if (tourCost >= min && tourCost <= max) {
      // Perfect match - within range
      return 1.0;
    } else if (tourCost < min) {
      // Under budget - still good but slightly lower score
      const diff = (min - tourCost) / min;
      return Math.max(0.7 - diff * 0.5, 0);
    } else {
      // Over budget - penalize more
      const diff = (tourCost - max) / max;
      return Math.max(0.5 - diff, 0);
    }
  }

  /**
   * Travel style matching
   */
  calculateStyleMatch(tour, travelStyles) {
    if (!travelStyles || travelStyles.length === 0) {
      return 0.5; // khong co so thich -> trung tinh
    }

    const tourThemes = tour.themes || [];
    const tourDifficulty = (tour.difficulty || '').toLowerCase();

    // Diem cua TUNG phong cach, roi lay cao nhat: nguoi chon nhieu phong cach
    // chi can tour khop MOT trong so do la du tot.
    let best = 0;

    for (const raw of travelStyles) {
      const key = normalizeStyle(raw);
      if (!key) continue;

      const mapping = tourMapping.travelStyle[key];
      const wanted = mapping.themes || [];

      // 70% tu do trung chu de, 30% tu do kho phu hop.
      //
      // Dung coverage (bao nhieu % chu de nguoi dung muon ma tour co) chu khong
      // dung Jaccard o day: tour co nhieu chu de khac khong phai la diem tru.
      const themeScore = coverage(wanted, tourThemes);
      const difficultyScore = (mapping.difficulty || []).includes(tourDifficulty) ? 1 : 0;

      best = Math.max(best, themeScore * 0.7 + difficultyScore * 0.3);
    }

    return Math.min(best, 1.0);
  }

  /**
   * Activities matching
   */
  calculateActivityMatch(tour, activities) {
    if (!activities || activities.length === 0) {
      return 0.5;
    }

    const tourThemes = new Set(tour.themes || []);

    // Chi dem nhung hoat dong NHAN RA DUOC vao mau so.
    //
    // Truoc day gia tri la ('cultural', 'beaches', 'nature') khong co trong bang
    // anh xa nen bi `continue` bo qua, NHUNG van nam trong mau so
    // `activities.length`. Ket qua: nguoi dung chon 3 hoat dong ma 1 cai khong
    // nhan ra thi diem toi da chi con 2/3 du ho khong chon gi sai.
    let recognised = 0;
    let matched = 0;

    for (const raw of activities) {
      const key = normalizeActivity(raw);
      if (!key) continue;
      recognised++;
      if ((tourMapping.activities[key] || []).some(theme => tourThemes.has(theme))) {
        matched++;
      }
    }

    if (recognised === 0) return 0.5; // khong hieu duoc so thich -> trung tinh
    return matched / recognised;
  }

  /**
   * Country/destination matching
   */
  calculateCountryMatch(tour, favoriteCountries) {
    if (!favoriteCountries || favoriteCountries.length === 0) {
      return 0.5;
    }

    const tourCountry = (tour.country || '').toLowerCase();
    const isMatch = favoriteCountries.some(country => 
      tourCountry.includes(country.toLowerCase()) || 
      country.toLowerCase().includes(tourCountry)
    );

    return isMatch ? 1.0 : 0.2;
  }

  /**
   * Climate matching
   */
  calculateClimateMatch(tour, climatePreference) {
    if (!climatePreference) {
      return 0.5;
    }

    const wanted = climatePreference.toLowerCase();

    // Tra cuu truc tiep theo quoc gia truoc. Bang CLIMATE_BY_COUNTRY da duoc bo
    // sung cho du ca 17 quoc gia dang co tour - truoc day Hong Kong, Portugal,
    // Greece, Netherlands, India deu bi thieu nen luon bi cham 0.3 du dung y khach.
    const tourClimate = climateOf(tour.country);
    if (tourClimate) return tourClimate === wanted ? 1.0 : 0.3;

    // Khong biet quoc gia -> doan theo chu de dac trung cua vung khi hau
    const mapping = tourMapping.climate[wanted];
    if (!mapping) return 0.5;

    const tourThemes = new Set(tour.themes || []);
    return (mapping.themes || []).some(t => tourThemes.has(t)) ? 1.0 : 0.3;
  }

  /**
   * Behavior matching (view history, wishlist, bookings)
   */
  calculateBehaviorMatch(tour, behavior) {
    if (!behavior) return 0;

    let score = 0;
    const tourId = tour._id.toString();

    // Check if in wishlist
    if (behavior.wishlist && behavior.wishlist.some(w => w.tourId?.toString() === tourId)) {
      score += 0.5;
    }

    // Check view history
    if (behavior.viewHistory) {
      const viewed = behavior.viewHistory.find(v => v.tourId?.toString() === tourId);
      if (viewed) {
        score += Math.min(viewed.duration / 300, 0.3); // Max 0.3 for 5 min view
      }
    }

    // Check if similar tours were booked
    if (behavior.bookingHistory && behavior.bookingHistory.length > 0) {
      const bookedCountries = behavior.bookingHistory.map(b => 
        b.country || ''
      ).filter(c => c);
      
      if (bookedCountries.includes(tour.country)) {
        score += 0.2;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Popularity score
   */
  calculatePopularityScore(tour) {
    const analytics = tour.analytics || {};
    const bookingCount = analytics.bookingCount || 0;
    const viewCount = analytics.viewCount || 0;
    const wishlistCount = analytics.wishlistCount || 0;

    // Normalize scores (assuming max values)
    const bookingScore = Math.min(bookingCount / 100, 1);
    const viewScore = Math.min(viewCount / 1000, 1);
    const wishlistScore = Math.min(wishlistCount / 50, 1);

    return (bookingScore * 0.5 + viewScore * 0.3 + wishlistScore * 0.2);
  }

  /**
   * Generate human-readable reasons
   */
  generateReasons(breakdown, tour) {
    const reasons = [];

    if (breakdown.budget >= 0.8) {
      reasons.push('Matches your budget perfectly');
    } else if (breakdown.budget >= 0.6) {
      reasons.push('Within your budget range');
    }

    if (breakdown.travelStyle >= 0.7) {
      reasons.push('Matches your travel style');
    }

    if (breakdown.activities >= 0.7) {
      reasons.push('Includes your favorite activities');
    }

    if (breakdown.country >= 0.9) {
      reasons.push('One of your favorite destinations');
    }

    if (breakdown.climate >= 0.8) {
      reasons.push('Perfect climate for you');
    }

    if (breakdown.rating >= 0.8) {
      reasons.push(`Highly rated (${tour.rating}/5)`);
    }

    if (breakdown.popularity >= 0.7) {
      reasons.push('Popular among travelers');
    }

    if (breakdown.behavior >= 0.5) {
      reasons.push('Based on your browsing history');
    }

    // Default reason if no strong matches
    if (reasons.length === 0) {
      reasons.push('Recommended based on your preferences');
    }

    return reasons.slice(0, 3); // Max 3 reasons
  }

  /**
   * Analyze search intent
   */
  async analyzeSearchIntent(query) {
    const intent = {
      suggestedStyles: [],
      suggestedActivities: [],
      budgetHint: null
    };
    
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('adventure') || queryLower.includes('phiêu lưu')) {
      intent.suggestedStyles.push('adventure');
    }
    if (queryLower.includes('relax') || queryLower.includes('nghỉ dưỡng')) {
      intent.suggestedStyles.push('relaxation');
    }
    if (queryLower.includes('culture') || queryLower.includes('văn hóa')) {
      intent.suggestedStyles.push('cultural');
    }
    
    return intent;
  }
}

module.exports = new RecommendationService();