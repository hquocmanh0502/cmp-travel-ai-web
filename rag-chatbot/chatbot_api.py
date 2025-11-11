from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import glob
import json
import requests
import time
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests

# OpenAI API configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "your_openai_api_key_here")
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

class CMPTravelChatbotAPI:
    def __init__(self):
        self.api_key = OPENAI_API_KEY
        self.knowledge_base_path = "knowledge-base-travel"
        self.all_content = []
        self.category_content = {}
        
        # OpenAI headers
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        self.system_prompt = """You are CMP Travel AI Assistant, a professional travel consultant.

ROLE: Expert travel advisor for CMP Travel company
- Friendly, helpful, and knowledgeable
- Provide detailed, accurate information
- Focus on customer satisfaction

RESPONSE GUIDELINES:
- Always respond in the same language as the user's question
- Use the provided context from CMP Travel's database
- Be specific about prices, dates, and details
- Suggest alternatives when possible
- Include contact information when relevant

CMP Travel Contact:
- Website: cmp-travel.com | Email: info@cmp-travel.com
- Hotline: 1900 1234 | Booking: booking@cmp-travel.com

Remember: You represent CMP Travel brand. Be professional and helpful!"""

        # Load knowledge base on startup
        self.load_all_content()

    def estimate_tokens(self, text):
        """Rough token estimation (1 token ≈ 4 characters for English)"""
        return len(text) // 4

    def load_all_content(self):
        """Load all content from knowledge base"""
        if not os.path.exists(self.knowledge_base_path):
            print(f"❌ Knowledge base not found at {self.knowledge_base_path}")
            return 0

        categories = ['tours', 'hotels', 'blogs', 'guides', 'general']
        total_loaded = 0

        for category in categories:
            category_path = f"{self.knowledge_base_path}/{category}"
            if os.path.exists(category_path):
                files = glob.glob(f"{category_path}/*.txt")
                category_content = []
                
                for file_path in files:
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                            if content.strip():
                                category_content.append(content)
                                self.all_content.append(content)
                                total_loaded += 1
                    except Exception as e:
                        print(f"⚠️ Cannot read file {file_path}: {str(e)}")
                
                self.category_content[category] = category_content

        print(f"✅ Loaded {total_loaded} documents")
        return total_loaded

    def get_relevant_context(self, query, max_results=3):
        """Get relevant context from knowledge base with token limit"""
        query_lower = query.lower()
        relevant_content = []
        
        # Score content based on keyword matches
        scored_content = []
        for content in self.all_content:
            content_lower = content.lower()
            score = 0
            
            # Search for query terms
            query_terms = query_lower.split()
            for term in query_terms:
                if term in content_lower:
                    score += content_lower.count(term)
            
            if score > 0:
                scored_content.append((score, content))
        
        # Sort by score and get top results
        scored_content.sort(key=lambda x: x[0], reverse=True)
        
        # Limit context length to avoid token limit
        total_chars = 0
        max_chars = 6000  # Conservative limit for web API
        
        for _, content in scored_content[:max_results]:
            if total_chars + len(content[:1200]) < max_chars:
                relevant_content.append(content[:1200])  # Truncate individual content
                total_chars += len(content[:1200])
            else:
                break
        
        return "\n\n---\n\n".join(relevant_content)

    def call_openai_api(self, user_message, context=""):
        """Call OpenAI API with token management"""
        
        # Calculate token estimates
        system_tokens = self.estimate_tokens(self.system_prompt)
        user_tokens = self.estimate_tokens(user_message)
        context_tokens = self.estimate_tokens(context)
        
        # Total input tokens (leave 600 for response)
        max_input_tokens = 16385 - 600
        current_tokens = system_tokens + user_tokens + context_tokens + 50
        
        # Truncate context if needed
        if current_tokens > max_input_tokens:
            available_for_context = max_input_tokens - system_tokens - user_tokens - 50
            max_context_chars = available_for_context * 4
            
            if max_context_chars > 0:
                context = context[:max_context_chars] + "..."
            else:
                context = "Limited context due to length constraints."
        
        full_prompt = f"""Context: {context}

User: {user_message}

Response:"""

        payload = {
            "model": "gpt-3.5-turbo",
            "messages": [
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": full_prompt}
            ],
            "max_tokens": 600,
            "temperature": 0.7
        }

        try:
            response = requests.post(
                OPENAI_API_URL,
                headers=self.headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                return result['choices'][0]['message']['content']
            else:
                error_info = response.json() if response.content else {"error": "Unknown error"}
                return f"Sorry, I'm experiencing technical difficulties. Error: {response.status_code}"
                
        except Exception as e:
            return "Sorry, I'm unable to connect to the AI service right now. Please try again later."

    def chat(self, user_input):
        """Main chat function"""
        if not self.all_content:
            return "❌ Knowledge base not loaded. Please contact support."
        
        # Get relevant context
        context = self.get_relevant_context(user_input)
        
        # Call OpenAI API
        response = self.call_openai_api(user_input, context)
        return response

# Initialize chatbot
chatbot = CMPTravelChatbotAPI()

@app.route('/chat', methods=['POST'])
def chat_endpoint():
    """Chat API endpoint"""
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({'error': 'Missing message field'}), 400
        
        user_message = data['message']
        if not user_message.strip():
            return jsonify({'error': 'Empty message'}), 400
        
        # Get chatbot response
        response = chatbot.chat(user_message)
        
        return jsonify({
            'response': response,
            'status': 'success'
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'knowledge_base_loaded': len(chatbot.all_content) > 0,
        'total_documents': len(chatbot.all_content)
    })

@app.route('/status', methods=['GET'])
def status():
    """Get chatbot status"""
    categories_info = {}
    for cat, content_list in chatbot.category_content.items():
        categories_info[cat] = len(content_list)
    
    return jsonify({
        'status': 'online',
        'total_documents': len(chatbot.all_content),
        'categories': categories_info,
        'api_model': 'gpt-3.5-turbo'
    })

if __name__ == '__main__':
    print("🚀 Starting CMP Travel Chatbot API...")
    print(f"📊 Loaded {len(chatbot.all_content)} documents")
    app.run(host='0.0.0.0', port=5000, debug=True)