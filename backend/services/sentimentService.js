// backend/services/sentimentService.js
class SentimentService {
  async analyzeSentiment(text) {
    try {
      // Simple sentiment analysis
      const positiveWords = ['tốt', 'tuyệt', 'đẹp', 'hài lòng', 'thích', 'good', 'great', 'excellent'];
      const negativeWords = ['tệ', 'dở', 'tệ', 'không tốt', 'bad', 'terrible', 'awful'];
      
      const textLower = text.toLowerCase();
      let score = 0;
      
      positiveWords.forEach(word => {
        if (textLower.includes(word)) score += 0.1;
      });
      
      negativeWords.forEach(word => {
        if (textLower.includes(word)) score -= 0.1;
      });
      
      score = Math.max(-1, Math.min(1, score));
      
      let label = 'neutral';
      if (score > 0.1) label = 'positive';
      else if (score < -0.1) label = 'negative';
      
      return {
        score,
        label,
        confidence: Math.abs(score)
      };
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return { score: 0, label: 'neutral', confidence: 0 };
    }
  }
  
  async extractKeywords(text) {
    // Simple keyword extraction
    const words = text.toLowerCase().split(' ');
    const stopwords = ['và', 'của', 'trong', 'với', 'là', 'một', 'có', 'the', 'and', 'or', 'but'];
    
    const keywords = words
      .filter(word => word.length > 3 && !stopwords.includes(word))
      .slice(0, 5);
    
    return keywords;
  }
  
  async categorizeContent(text) {
    const categories = [];
    const textLower = text.toLowerCase();
    
    if (textLower.includes('hướng dẫn') || textLower.includes('dịch vụ') || textLower.includes('service')) {
      categories.push('service');
    }
    if (textLower.includes('địa điểm') || textLower.includes('location')) {
      categories.push('location');
    }
    if (textLower.includes('giá') || textLower.includes('price')) {
      categories.push('price');
    }
    
    return categories;
  }
  
  async getTopKeywords(feedbacks) {
    const keywordCount = {};
    
    feedbacks.forEach(feedback => {
      feedback.keywords?.forEach(keyword => {
        keywordCount[keyword] = (keywordCount[keyword] || 0) + 1;
      });
    });
    
    return Object.entries(keywordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count }));
  }
  
  async getCategoryBreakdown(feedbacks) {
    const categoryCount = {};
    
    feedbacks.forEach(feedback => {
      feedback.categories?.forEach(category => {
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });
    });
    
    return categoryCount;
  }
}

module.exports = new SentimentService();