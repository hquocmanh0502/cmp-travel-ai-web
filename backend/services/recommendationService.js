// backend/services/recommendationService.js
const Tour = require('../models/Tour');
const User = require('../models/User');

class RecommendationService {
  async generateRecommendations(user) {
    try {
      console.log('Generating recommendations for user:', user.username);
      
      const popularTours = await Tour.find()
        .sort({ popularityScore: -1, rating: -1 })
        .limit(5);
      
      const recommendations = popularTours.map(tour => ({
        tour: tour,
        score: Math.random() * 0.5 + 0.5,
        reason: 'Popular tour recommendation',
        algorithm: 'simple_popularity'
      }));
      
      return recommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  }
  
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
  
  async personalizeResults(tours, user) {
    return tours;
  }
}

module.exports = new RecommendationService();