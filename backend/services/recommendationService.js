// backend/services/recommendationService.js
const Tour = require('../models/Tour');
const User = require('../models/User');
const tourMapping = require('../config/tour-mapping');

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
      return 0.5;
    }

    let matchScore = 0;
    const tourTags = (tour.tags || []).map(t => t.toLowerCase());
    const tourCost = tour.estimatedCost || 0;
    const tourDifficulty = (tour.difficulty || '').toLowerCase();

    for (const style of travelStyles) {
      const mapping = tourMapping.travelStyle[style.toLowerCase()];
      if (!mapping) {
        console.log(`⚠️ No mapping found for style: ${style}`);
        continue;
      }

      let styleScore = 0;
      let factors = 0;

      // Check cost range
      if (mapping.minCost !== undefined && mapping.maxCost !== undefined) {
        if (tourCost >= mapping.minCost && tourCost <= mapping.maxCost) {
          styleScore += 1;
        }
        factors++;
      }

      // Check tags
      if (mapping.tags && mapping.tags.length > 0) {
        const matchingTags = mapping.tags.filter(tag => 
          tourTags.some(tourTag => 
            tourTag.includes(tag.toLowerCase()) || 
            tag.toLowerCase().includes(tourTag)
          )
        );
        styleScore += matchingTags.length / mapping.tags.length;
        factors++;
      }

      // Check difficulty
      if (mapping.difficulty && mapping.difficulty.length > 0) {
        if (mapping.difficulty.map(d => d.toLowerCase()).includes(tourDifficulty)) {
          styleScore += 1;
        }
        factors++;
      }

      // Avoid division by zero - ensure we have at least one factor
      if (factors === 0) {
        factors = 1; // Default to 1 to avoid NaN
      }
      
      const currentScore = styleScore / factors;
      matchScore = Math.max(matchScore, currentScore);
    }

    return Math.min(matchScore, 1.0); // Cap at 1.0
  }

  /**
   * Activities matching
   */
  calculateActivityMatch(tour, activities) {
    if (!activities || activities.length === 0) {
      return 0.5;
    }

    const tourTags = (tour.tags || []).map(t => t.toLowerCase());
    const tourAttractions = (tour.attractions || []).map(a => a.toLowerCase());
    const allTourContent = [...tourTags, ...tourAttractions, tour.description?.toLowerCase() || ''].join(' ');

    let matchCount = 0;
    for (const activity of activities) {
      const mapping = tourMapping.activities[activity.toLowerCase()];
      if (!mapping) continue;

      const hasMatch = mapping.some(keyword => 
        allTourContent.includes(keyword.toLowerCase())
      );
      if (hasMatch) matchCount++;
    }

    return activities.length > 0 ? matchCount / activities.length : 0;
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

    const mapping = tourMapping.climate[climatePreference.toLowerCase()];
    if (!mapping) return 0.5;

    // Check country
    const tourCountry = tour.country || '';
    const countryMatch = mapping.countries.some(country => 
      tourCountry.toLowerCase().includes(country.toLowerCase())
    );

    // Check tags
    const tourTags = (tour.tags || []).map(t => t.toLowerCase());
    const tagMatch = mapping.tags.some(tag => 
      tourTags.includes(tag.toLowerCase())
    );

    return countryMatch || tagMatch ? 1.0 : 0.3;
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