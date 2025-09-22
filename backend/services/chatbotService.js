// backend/services/chatbotService.js
const Tour = require('../models/Tour');

class ChatbotService {
  async processMessage(message, sessionId, userId) {
    try {
      const messageLower = message.toLowerCase();
      const intent = this.detectIntent(messageLower);
      
      let response = '';
      let suggestions = [];
      
      switch (intent) {
        case 'tour_inquiry':
          response = await this.handleTourInquiry(messageLower);
          suggestions = ['Tour phổ biến', 'Gợi ý cho tôi', 'Tour giá rẻ'];
          break;
          
        case 'price_question':
          response = await this.handlePriceQuestion(messageLower);
          suggestions = ['Tour dưới 5000$', 'Tour giá rẻ nhất'];
          break;
          
        case 'greeting':
          response = 'Xin chào! Chào mừng bạn đến với CMP Travel. Tôi có thể giúp bạn tìm tour phù hợp. Bạn muốn đi đâu?';
          suggestions = ['Gợi ý tour', 'Giá tour', 'Tour phổ biến'];
          break;
          
        default:
          response = 'Tôi hiểu bạn có câu hỏi về du lịch. Bạn có thể hỏi tôi về tour, giá cả, điểm đến...';
          suggestions = ['Xem tour', 'Hỏi về giá', 'Điểm đến hot'];
      }
      
      return { message: response, intent, suggestions };
    } catch (error) {
      console.error('Error processing chatbot message:', error);
      return {
        message: 'Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại.',
        intent: 'error',
        suggestions: ['Tour phổ biến', 'Liên hệ hỗ trợ']
      };
    }
  }
  
  detectIntent(message) {
    if (message.includes('tour') || message.includes('du lịch') || message.includes('đi')) {
      return 'tour_inquiry';
    }
    if (message.includes('giá') || message.includes('price') || message.includes('bao nhiêu')) {
      return 'price_question';
    }
    if (message.includes('xin chào') || message.includes('hello') || message.includes('hi')) {
      return 'greeting';
    }
    return 'general';
  }
  
  async handleTourInquiry(message) {
    try {
      const tours = await Tour.find().limit(3).sort({ rating: -1 });
      
      if (tours.length > 0) {
        let response = 'Đây là một số tour phổ biến:\n\n';
        tours.forEach((tour, index) => {
          response += `${index + 1}. ${tour.name} - ${tour.estimatedCost}$\n`;
        });
        return response;
      }
      
      return 'Chúng tôi có nhiều tour tuyệt vời! Bạn quan tâm loại hình du lịch nào?';
    } catch (error) {
      return 'Tôi có thể giúp bạn tìm tour phù hợp! Bạn muốn đi đâu?';
    }
  }
  
  async handlePriceQuestion(message) {
    try {
      const tours = await Tour.find().limit(3).sort({ estimatedCost: 1 });
      
      if (tours.length > 0) {
        let response = 'Một số tour với giá tốt:\n\n';
        tours.forEach((tour, index) => {
          response += `${index + 1}. ${tour.name} - ${tour.estimatedCost}$ per person\n`;
        });
        return response;
      }
      
      return 'Giá tour của chúng tôi từ 3,000$ đến 8,000$ tùy điểm đến. Bạn có ngân sách bao nhiều?';
    } catch (error) {
      return 'Tour của chúng tôi có nhiều mức giá khác nhau. Bạn cho tôi biết ngân sách để tư vấn phù hợp?';
    }
  }
}

module.exports = new ChatbotService();