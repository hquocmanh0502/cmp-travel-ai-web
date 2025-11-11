"""
CMP Travel AI Assistant - OpenAI Version
Chatbot for travel consultation using OpenAI GPT models
"""

import streamlit as st
import os
import glob
import json
import requests
import time
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# OpenAI API configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "your_openai_api_key_here")
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

class CMPTravelChatbotOpenAI:
    def __init__(self, api_key=None):
        self.api_key = api_key or OPENAI_API_KEY
        self.knowledge_base_path = "knowledge-base-travel"
        self.all_content = []
        self.category_content = {}
        
        # OpenAI headers
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        self.system_prompt = """
You are CMP Travel AI Assistant, a professional travel consultant powered by OpenAI GPT.

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

Remember: You represent CMP Travel brand. Be professional and helpful!
"""

    def estimate_tokens(self, text):
        """Rough token estimation (1 token ≈ 4 characters for English)"""
        return len(text) // 4

    def call_openai_api(self, user_message, context=""):
        """Call OpenAI API with retry mechanism and token management"""
        
        # Calculate token estimates
        system_tokens = self.estimate_tokens(self.system_prompt)
        user_tokens = self.estimate_tokens(user_message)
        context_tokens = self.estimate_tokens(context)
        
        # Total input tokens (leave 800 for response)
        max_input_tokens = 16385 - 800
        current_tokens = system_tokens + user_tokens + context_tokens + 50  # buffer
        
        # Truncate context if needed
        if current_tokens > max_input_tokens:
            # Calculate how much context we can keep
            available_for_context = max_input_tokens - system_tokens - user_tokens - 50
            max_context_chars = available_for_context * 4  # Convert back to chars
            
            if max_context_chars > 0:
                context = context[:max_context_chars] + "\n\n... (truncated)"
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
            "max_tokens": 800,
            "temperature": 0.7
        }

        max_retries = 3
        for attempt in range(max_retries):
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
                    st.error(f"❌ OpenAI API Error (Code {response.status_code}): {error_info}")
                    
                    if attempt < max_retries - 1:
                        time.sleep(2 ** attempt)  # Exponential backoff
                        continue
                    else:
                        return "Sorry, I'm experiencing technical difficulties. Please try again in a moment."
                        
            except requests.exceptions.RequestException as e:
                st.error(f"❌ Connection Error: {str(e)}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                    continue
                else:
                    return "Sorry, I'm unable to connect to the AI service right now. Please try again later."

    def load_all_content(self):
        """Load all content from knowledge base"""
        if not os.path.exists(self.knowledge_base_path):
            st.error(f"❌ Knowledge base not found at {self.knowledge_base_path}")
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
                        st.warning(f"⚠️ Cannot read file {file_path}: {str(e)}")
                
                self.category_content[category] = category_content

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
        max_chars = 8000  # Roughly 2000 tokens to stay safe
        
        for _, content in scored_content[:max_results]:
            if total_chars + len(content) < max_chars:
                relevant_content.append(content[:1500])  # Truncate individual content
                total_chars += len(content[:1500])
            else:
                break
        
        return "\n\n---\n\n".join(relevant_content)

    def chat(self, user_input):
        """Main chat function"""
        if not self.all_content:
            return "❌ Knowledge base not loaded. Please initialize the chatbot first."
        
        # Get relevant context
        context = self.get_relevant_context(user_input)
        
        # Call OpenAI API
        response = self.call_openai_api(user_input, context)
        return response

    def test_api_connection(self):
        """Test OpenAI API connection"""
        try:
            response = requests.post(
                OPENAI_API_URL,
                headers=self.headers,
                json={
                    "model": "gpt-3.5-turbo",
                    "messages": [{"role": "user", "content": "Test connection"}],
                    "max_tokens": 10
                },
                timeout=10
            )
            return response.status_code == 200
        except:
            return False

def main():
    st.set_page_config(
        page_title="CMP Travel AI Assistant - OpenAI",
        page_icon="🤖",
        layout="wide"
    )

    # Header
    st.markdown("""
    <div style="background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); padding: 2rem; border-radius: 10px; margin-bottom: 2rem;">
        <h1 style="color: white; text-align: center; margin: 0;">
            🤖 CMP Travel AI Assistant
        </h1>
        <p style="color: #f8f9fa; text-align: center; margin: 0.5rem 0 0 0; font-size: 1.2rem;">
            ⚡ Powered by OpenAI GPT-3.5 Turbo
        </p>
    </div>
    """, unsafe_allow_html=True)

    # Sidebar
    with st.sidebar:
        st.markdown("### ⚙️ Settings")
        
        # API Status
        st.markdown("### 🔗 API Status")
        if st.button("🧪 Test OpenAI Connection"):
            temp_chatbot = CMPTravelChatbotOpenAI()
            if temp_chatbot.test_api_connection():
                st.success("✅ OpenAI API connection successful!")
            else:
                st.error("❌ Cannot connect to OpenAI API")

        st.markdown("---")
        
        # Chatbot status
        if 'chatbot' in st.session_state and st.session_state.chatbot:
            st.markdown("### 🤖 Bot Status")
            st.success("✅ **Ready to serve!**")
            
            # Display statistics
            categories = list(st.session_state.chatbot.category_content.keys())
            if categories:
                st.markdown("**📊 Loaded data:**")
                emojis = {
                    'tours': '🏖️', 
                    'hotels': '🏨', 
                    'guides': '👨‍💼', 
                    'blogs': '📝', 
                    'general': '📋'
                }
                
                total_items = 0
                for cat in categories:
                    count = len(st.session_state.chatbot.category_content[cat])
                    total_items += count
                    emoji = emojis.get(cat, '📄')
                    st.markdown(f"{emoji} **{cat.title()}:** `{count}` items")
                
                st.info(f"🎯 **Total:** {total_items} documents")
        else:
            st.markdown("### ⏳ Waiting to Start")
            st.warning("🔄 Bot not initialized yet")
        
        st.markdown("---")
        
        # Control buttons
        col1, col2 = st.columns(2)
        
        with col1:
            setup_clicked = st.button(
                "🚀 Initialize", 
                type="primary", 
                use_container_width=True,
                help="Initialize chatbot with OpenAI"
            )
        
        with col2:
            check_clicked = st.button(
                "📊 Check Data", 
                use_container_width=True,
                help="View available data"
            )

        # Handle button clicks
        if setup_clicked:
            with st.spinner("🔄 Initializing OpenAI chatbot..."):
                try:
                    chatbot = CMPTravelChatbotOpenAI()
                    content_count = chatbot.load_all_content()
                    
                    if content_count > 0:
                        st.session_state.chatbot = chatbot
                        st.success(f"🎉 Initialization successful! Loaded {content_count} documents")
                        st.balloons()
                        st.rerun()
                    else:
                        st.error("❌ No data found!")
                except Exception as e:
                    st.error(f"❌ Initialization error: {str(e)}")

        if check_clicked:
            kb_path = "knowledge-base-travel"
            if os.path.exists(kb_path):
                files = glob.glob(f"{kb_path}/**/*.txt", recursive=True)
                st.success(f"✅ Found **{len(files)}** files")
                
                # Show categories
                categories = {}
                for file_path in files:
                    if 'tours' in file_path:
                        categories['Tours'] = categories.get('Tours', 0) + 1
                    elif 'hotels' in file_path:
                        categories['Hotels'] = categories.get('Hotels', 0) + 1
                    elif 'guides' in file_path:
                        categories['Guides'] = categories.get('Guides', 0) + 1
                    elif 'blogs' in file_path:
                        categories['Blogs'] = categories.get('Blogs', 0) + 1
                    elif 'general' in file_path:
                        categories['General'] = categories.get('General', 0) + 1
                
                for cat, count in categories.items():
                    st.markdown(f"📁 **{cat}:** {count} files")
            else:
                st.error("❌ Knowledge base not found!")
                st.markdown("**🔧 Solution:**")
                st.code("python extract_mongodb_data.py", language="bash")

        st.markdown("---")
        
        # Quick guide
        st.markdown("### 📚 Usage Guide")
        with st.expander("📖 View guide"):
            st.markdown("""
            **🎯 Steps to use:**
            1. ✅ OpenAI API key is configured
            2. 🚀 Click "Initialize" button
            3. 💬 Start chatting with AI
            
            **💡 Tips for better answers:**
            - Ask specifically about locations and time
            - Use clear keywords
            - Try sample question buttons
            
            **🎨 Good question examples:**
            • "3-day 2-night Da Nang tour for families"
            • "5-star hotels near beach in Nha Trang"
            • "Phu Quoc tour prices in December"
            • "English-speaking guides in Hanoi"
            """)

        # API Info
        with st.expander("⚡ OpenAI API Info"):
            st.markdown("""
            **🔥 GPT-3.5 Turbo Features:**
            - Advanced natural language processing
            - Better context understanding
            - Fast and accurate responses
            - Multilingual support
            
            **🛠️ REST API:**
            - Direct connection, stable
            - Low latency
            - Good compatibility
            """)

    # Main content area
    if 'chatbot' not in st.session_state or not hasattr(st.session_state, 'chatbot') or not st.session_state.chatbot:
        # Welcome screen
        col1, col2, col3 = st.columns([1, 3, 1])
        
        with col2:
            st.markdown("""
            <div style="text-align: center; padding: 3rem; background: linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 20px; border-left: 6px solid #667eea; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <h2 style="color: #495057; margin-bottom: 1rem; font-weight: 600;">👋 Welcome to CMP Travel AI Assistant!</h2>
                <p style="color: #6c757d; font-size: 1.2rem; margin-bottom: 2rem; line-height: 1.6;">
                    🤖 Smart AI Assistant powered by <strong>OpenAI GPT-3.5 Turbo</strong><br>
                    💎 Ready to assist with all your travel needs 24/7
                </p>
            </div>
            """, unsafe_allow_html=True)
            
            st.markdown("<br>", unsafe_allow_html=True)
            
            # Status check
            if os.path.exists("knowledge-base-travel"):
                st.success("✅ **Data is ready!** Click '🚀 Initialize' in sidebar")
            else:
                st.warning("⚠️ **No data yet.** Need to run: `python extract_mongodb_data.py`")
        
        # Showcase features
        st.markdown("---")
        st.markdown("### 🌟 OpenAI GPT-3.5 Turbo Key Features")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.markdown("""
            <div style="padding: 1.5rem; background: #e8f5e8; border-radius: 10px; border-left: 4px solid #28a745;">
                <h4 style="color: #155724; margin-bottom: 1rem;">🎯 Smart Understanding</h4>
                <ul style="color: #155724; margin: 0; padding-left: 1rem;">
                    <li>Accurate context analysis</li>
                    <li>Personalized recommendations</li>
                    <li>Smart consultation</li>
                </ul>
            </div>
            """, unsafe_allow_html=True)
        
        with col2:
            st.markdown("""
            <div style="padding: 1.5rem; background: #e3f2fd; border-radius: 10px; border-left: 4px solid #2196f3;">
                <h4 style="color: #0d47a1; margin-bottom: 1rem;">⚡ Fast Response</h4>
                <ul style="color: #0d47a1; margin: 0; padding-left: 1rem;">
                    <li>Real-time processing</li>
                    <li>Updated information</li>
                    <li>High accuracy</li>
                </ul>
            </div>
            """, unsafe_allow_html=True)
        
        with col3:
            st.markdown("""
            <div style="padding: 1.5rem; background: #fff3cd; border-radius: 10px; border-left: 4px solid #ffc107;">
                <h4 style="color: #856404; margin-bottom: 1rem;">🎨 Great Experience</h4>
                <ul style="color: #856404; margin: 0; padding-left: 1rem;">
                    <li>User-friendly interface</li>
                    <li>Vivid responses</li>
                    <li>Diverse support</li>
                </ul>
            </div>
            """, unsafe_allow_html=True)

        # Sample questions preview
        st.markdown("---")
        st.markdown("### 💡 What you can ask AI:")
        
        sample_categories = {
            "🏖️ Tours & Experiences": [
                "What's special about Da Nang - Hoi An 4D3N tour?",
                "Family package tour for 6 people to Phu Quoc",
                "1-week Northern Vietnam exploration itinerary",
                "Adventure tours for young travelers"
            ],
            "🏨 Hotels & Accommodation": [
                "Best 5-star beach view resorts in Nha Trang",
                "Boutique hotels in Ho Chi Minh City under $100",
                "Luxury resorts in Da Lat",
                "Private villas for group of friends"
            ],
            "🎯 Services & Consultation": [
                "South Korea tourist visa procedures",
                "Latest CMP Travel service prices",
                "Tour cancellation policy during pandemic",
                "Cheap flight tickets to Japan"
            ]
        }
        
        cols = st.columns(3)
        for i, (category, questions) in enumerate(sample_categories.items()):
            with cols[i]:
                st.markdown(f"**{category}**")
                for q in questions:
                    st.markdown(f"• {q}")
        
        return

    # Chat interface
    if not st.session_state.chatbot.all_content:
        st.error("❌ No data available for chat. Please check knowledge base!")
        return

    # Initialize chat history
    if 'messages' not in st.session_state:
        st.session_state.messages = [{
            "role": "assistant", 
            "content": """
🌟 **Hello! I'm CMP Travel AI Assistant** powered by **OpenAI GPT-3.5 Turbo**! 

🎯 **I can help you with:**

🏖️ **Travel & Tours:** Itinerary advice, hot spots, budget-friendly tours
🏨 **Hotels & Resorts:** Room booking, price comparison, ideal accommodation  
👨‍💼 **Tour Guides:** Professional guides, special services
💰 **Pricing & Deals:** Latest prices, money-saving combos
📋 **Procedures & Documents:** Visas, insurance, entry/exit procedures

💬 **Ask me anything about travel!** I'll provide detailed and specific advice for you. 

✨ *Or try the quick question buttons below to explore more!*
"""
        }]

    # Display chat history
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    # Chat input
    if prompt := st.chat_input("💬 Ask me anything about travel..."):
        # Add user message
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)
        
        # Get bot response
        with st.chat_message("assistant"):
            with st.spinner("🤖 AI is analyzing and consulting for you..."):
                response = st.session_state.chatbot.chat(prompt)
                st.markdown(response)
        
        # Add assistant response
        st.session_state.messages.append({"role": "assistant", "content": response})

    # Quick action buttons
    st.markdown("---")
    st.markdown("### 🚀 Quick Questions - Click to try now:")
    
    # Row 1: Popular categories
    col1, col2, col3, col4 = st.columns(4)
    
    quick_questions_1 = [
        ("🏖️ HOT Tours", "Top 5 hottest travel tours from CMP Travel"),
        ("🏨 5⭐ Resorts", "Best 5-star resorts in Vietnam with spa and casino"),
        ("💰 Best Prices", "Best tour + hotel combo deals this month"),
        ("📞 Contact Now", "CMP Travel contact information and office address")
    ]
    
    for i, (btn_text, question) in enumerate(quick_questions_1):
        with [col1, col2, col3, col4][i]:
            if st.button(btn_text, key=f"quick1_{i}", use_container_width=True):
                st.session_state.messages.append({"role": "user", "content": question})
                st.rerun()

    # Row 2: Specific needs
    col1, col2, col3, col4 = st.columns(4)
    
    quick_questions_2 = [
        ("👨‍👩‍👧‍👦 Family", "Family tours with children under 12, safe and fun"),
        ("🏔️ North Vietnam", "Northern Vietnam exploration tour: Hanoi - Sapa - Ha Long 5D4N"),
        ("🏝️ Pearl Island", "Most beautiful Phu Quoc resorts with private beach and VIP services"),
        ("💡 Free Advice", "Free consultation for 7-day romantic honeymoon itinerary")
    ]
    
    for i, (btn_text, question) in enumerate(quick_questions_2):
        with [col1, col2, col3, col4][i]:
            if st.button(btn_text, key=f"quick2_{i}", use_container_width=True):
                st.session_state.messages.append({"role": "user", "content": question})
                st.rerun()

    # Row 3: Special services
    col1, col2, col3, col4 = st.columns(4)
    
    quick_questions_3 = [
        ("🎯 Personalized", "Design private tours based on personal preferences"),
        ("✈️ Visa Express", "Fast visa services for Europe and Asia countries"),
        ("🎉 Events", "Organize team building tours for 50-person companies"),
        ("🌟 VIP Service", "VIP package: private car, private guide, priority check-in")
    ]
    
    for i, (btn_text, question) in enumerate(quick_questions_3):
        with [col1, col2, col3, col4][i]:
            if st.button(btn_text, key=f"quick3_{i}", use_container_width=True):
                st.session_state.messages.append({"role": "user", "content": question})
                st.rerun()

if __name__ == "__main__":
    main()