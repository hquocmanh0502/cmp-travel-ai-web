#!/usr/bin/env python3
"""
Script để trích xuất dữ liệu từ MongoDB và tạo knowledge base cho RAG chatbot
"""

import json
import os
from pymongo import MongoClient
from datetime import datetime
import pandas as pd

# Cấu hình MongoDB
MONGODB_URI = "mongodb+srv://hoangquocmanh2004_db_user:NuB0wKG7gc3QiGn0@cluster0.gs9owka.mongodb.net/traveldb?retryWrites=true&w=majority"

def connect_mongodb():
    """Kết nối đến MongoDB"""
    try:
        client = MongoClient(MONGODB_URI)
        db = client['traveldb']
        print("✅ Kết nối MongoDB thành công!")
        return client, db
    except Exception as e:
        print(f"❌ Lỗi kết nối MongoDB: {e}")
        return None, None

def extract_tours_data(db):
    """Trích xuất dữ liệu tours"""
    try:
        tours_collection = db['tours']
        tours = list(tours_collection.find({}))
        print(f"📋 Tìm thấy {len(tours)} tours")
        return tours
    except Exception as e:
        print(f"❌ Lỗi trích xuất tours: {e}")
        return []

def extract_hotels_data(db):
    """Trích xuất dữ liệu hotels"""
    try:
        hotels_collection = db['hotels']
        hotels = list(hotels_collection.find({}))
        print(f"🏨 Tìm thấy {len(hotels)} hotels")
        return hotels
    except Exception as e:
        print(f"❌ Lỗi trích xuất hotels: {e}")
        return []

def extract_blogs_data(db):
    """Trích xuất dữ liệu blogs"""
    try:
        blogs_collection = db['blogs']
        blogs = list(blogs_collection.find({}))
        print(f"📝 Tìm thấy {len(blogs)} blogs")
        return blogs
    except Exception as e:
        print(f"❌ Lỗi trích xuất blogs: {e}")
        return []

def extract_guides_data(db):
    """Trích xuất dữ liệu tour guides"""
    try:
        guides_collection = db['tourguides']
        guides = list(guides_collection.find({}))
        print(f"👨‍💼 Tìm thấy {len(guides)} tour guides")
        return guides
    except Exception as e:
        print(f"❌ Lỗi trích xuất guides: {e}")
        return []

def create_knowledge_base_structure():
    """Tạo cấu trúc thư mục cho knowledge base"""
    base_path = "knowledge-base-travel"
    
    directories = [
        f"{base_path}/tours",
        f"{base_path}/hotels", 
        f"{base_path}/blogs",
        f"{base_path}/guides",
        f"{base_path}/general"
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
    
    return base_path

def convert_objectid_to_string(obj):
    """Chuyển đổi ObjectId thành string để serialize JSON"""
    if isinstance(obj, dict):
        return {key: convert_objectid_to_string(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_objectid_to_string(item) for item in obj]
    elif hasattr(obj, '__str__') and 'ObjectId' in str(type(obj)):
        return str(obj)
    else:
        return obj

def create_tour_documents(tours, base_path):
    """Create documents for tours with realistic USD pricing"""
    tour_texts = []
    
    # Sample realistic prices in USD for different tour types
    tour_price_ranges = {
        'maldives': {'min': 2500, 'max': 4500},
        'switzerland': {'min': 2800, 'max': 5200},
        'amsterdam': {'min': 1800, 'max': 3200},
        'vietnam': {'min': 800, 'max': 2500},
        'japan': {'min': 2200, 'max': 4800},
        'thailand': {'min': 1200, 'max': 2800},
        'singapore': {'min': 1500, 'max': 3500},
        'default': {'min': 1500, 'max': 3500}
    }
    
    for i, tour in enumerate(tours):
        # Convert ObjectId to string
        tour_clean = convert_objectid_to_string(tour)
        
        # Generate realistic price based on destination
        destination_name = str(tour_clean.get('destination', {}).get('name', '')).lower()
        price_range = tour_price_ranges.get('default')
        
        for key, range_val in tour_price_ranges.items():
            if key in destination_name:
                price_range = range_val
                break
        
        # Generate price based on duration and type
        duration_str = tour_clean.get('duration', '3-5 days')
        if 'days' in str(duration_str):
            try:
                duration_parts = str(duration_str).split()
                if '-' in duration_parts[0]:
                    avg_days = sum(map(int, duration_parts[0].split('-'))) / 2
                else:
                    avg_days = int(duration_parts[0])
            except:
                avg_days = 4
        else:
            avg_days = 4
            
        # Calculate realistic price
        base_price = price_range['min'] + (i % 3) * ((price_range['max'] - price_range['min']) // 3)
        final_price = int(base_price + (avg_days - 3) * 200)
        
        # Create text content for tour
        content = f"""
TOUR: {tour_clean.get('name', 'Amazing Travel Experience')}

Description: {tour_clean.get('description', 'Discover breathtaking destinations with our expertly crafted tour packages. Experience local culture, stunning landscapes, and unforgettable adventures.')}

Destination: {tour_clean.get('destination', {}).get('name', 'Premium Destination')}
Location: {tour_clean.get('location', 'Beautiful scenic location')}
Price: ${final_price} USD (includes accommodation, meals, and guided tours)
Duration: {duration_str}
Tour Type: {tour_clean.get('type', 'Cultural & Adventure')}

Highlights:
• Stunning scenic views and photo opportunities
• Professional English-speaking guide
• Authentic local cuisine experience  
• Comfortable accommodation included
• Small group tours (max 12 people)

Detailed Itinerary:
{tour_clean.get('itinerary', 'Day 1: Arrival and city exploration | Day 2: Main attractions and cultural sites | Day 3: Adventure activities and local experiences | Day 4: Departure')}

Package Includes:
• Round-trip transportation
• Professional tour guide
• All entrance fees
• Daily breakfast and select meals
• Comfortable accommodation
• Travel insurance

Not Included:
• International flights
• Personal expenses
• Optional activities
• Tips for guide and driver

Special Notes:
{tour_clean.get('notes', 'Book early for best rates! Group discounts available. Free cancellation up to 7 days before departure.')}

Booking Information:
Contact CMP Travel for reservations and custom itineraries.
Phone: +84 28 1234 5678
Email: booking@cmp-travel.com
"""
        
        tour_texts.append(content.strip())
        
        # Save each tour as separate file
        filename = f"{base_path}/tours/tour_{tour_clean.get('_id', 'unknown')}.txt"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content.strip())
    
    # Save all tours in one file
    with open(f"{base_path}/tours/all_tours.txt", 'w', encoding='utf-8') as f:
        f.write("\n\n" + "="*80 + "\n\n".join(tour_texts))
    
    print(f"✅ Đã tạo {len(tour_texts)} tour documents")
    return tour_texts

def create_hotel_documents(hotels, base_path):
    """Create documents for hotels with realistic USD pricing"""
    hotel_texts = []
    
    # Hotel price ranges by star rating (per night in USD)
    hotel_price_ranges = {
        5: {'min': 200, 'max': 800},  # 5-star luxury
        4: {'min': 100, 'max': 300},  # 4-star
        3: {'min': 50, 'max': 150},   # 3-star
        2: {'min': 25, 'max': 80},    # 2-star
        1: {'min': 15, 'max': 50}     # Budget
    }
    
    for i, hotel in enumerate(hotels):
        hotel_clean = convert_objectid_to_string(hotel)
        
        # Determine star rating based on amenities/type
        amenities = hotel_clean.get('amenities', [])
        hotel_type = str(hotel_clean.get('type', '')).lower()
        
        if 'resort' in hotel_type or any(word in str(amenities).lower() for word in ['spa', 'pool', 'concierge', 'suite']):
            star_rating = 5
        elif 'hotel' in hotel_type and any(word in str(amenities).lower() for word in ['gym', 'restaurant', 'room service']):
            star_rating = 4
        elif any(word in str(amenities).lower() for word in ['wifi', 'breakfast', 'parking']):
            star_rating = 3
        else:
            star_rating = 3  # default
            
        price_range = hotel_price_ranges[star_rating]
        nightly_rate = price_range['min'] + (i % 4) * ((price_range['max'] - price_range['min']) // 4)
        
        # Generate realistic amenities if not available
        star_amenities = {
            5: ['Luxury spa and wellness center', 'Infinity pool with ocean view', 'Fine dining restaurant', '24/7 concierge service', 'Premium room service', 'Fitness center', 'Business center', 'Valet parking'],
            4: ['Swimming pool', 'Restaurant and bar', 'Fitness center', 'Room service', 'Free Wi-Fi', 'Concierge service', 'Business facilities'],
            3: ['Free Wi-Fi', 'Continental breakfast', 'Air conditioning', 'TV and cable', 'Private bathroom', '24-hour front desk'],
            2: ['Free Wi-Fi', 'Air conditioning', 'Private bathroom', 'Daily housekeeping'],
            1: ['Free Wi-Fi', 'Shared facilities', 'Basic accommodation']
        }
        
        amenities_list = hotel_clean.get('amenities', star_amenities[star_rating])
        if not amenities_list:
            amenities_list = star_amenities[star_rating]
        
        content = f"""
HOTEL: {hotel_clean.get('name', 'Premium Hotel & Resort')}

Address: {hotel_clean.get('address', 'Prime city/resort location')}
City: {hotel_clean.get('city', 'Major destination')}
Country: {hotel_clean.get('country', 'Vietnam')}

Description: {hotel_clean.get('description', f'Elegant {star_rating}-star accommodation offering exceptional comfort and service in a prime location.')}

Star Rating: {star_rating} stars
Hotel Type: {hotel_clean.get('type', f'{star_rating}-star Hotel')}
Price: ${nightly_rate} USD per night (excluding taxes and fees)

Amenities & Facilities:
{chr(10).join([f'• {amenity}' for amenity in amenities_list])}

Services:
• Professional multilingual staff
• 24-hour front desk assistance
• Luggage storage and concierge
• Tour booking and travel assistance
• Airport transfer available
• Laundry and dry cleaning
• Currency exchange

Contact Information:
Email: {hotel_clean.get('contact', {}).get('email', 'reservations@hotel.com')}
Phone: {hotel_clean.get('contact', {}).get('phone', '+84 28 1234 5678')}
Website: {hotel_clean.get('contact', {}).get('website', 'www.hotel.com')}

Booking Policies:
• Check-in: 3:00 PM | Check-out: 12:00 PM  
• Free cancellation up to 24 hours before arrival
• Children under 12 stay free with parents
• Pet-friendly options available
• Non-smoking rooms available

Special CMP Travel Rates Available!
Contact: booking@cmp-travel.com for exclusive deals
"""
        
        hotel_texts.append(content.strip())
        
        filename = f"{base_path}/hotels/hotel_{hotel_clean.get('_id', 'unknown')}.txt"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content.strip())
    
    with open(f"{base_path}/hotels/all_hotels.txt", 'w', encoding='utf-8') as f:
        f.write("\n\n" + "="*80 + "\n\n".join(hotel_texts))
    
    print(f"✅ Đã tạo {len(hotel_texts)} hotel documents")
    return hotel_texts

def create_blog_documents(blogs, base_path):
    """Create documents for blogs"""
    blog_texts = []
    
    for blog in blogs:
        blog_clean = convert_objectid_to_string(blog)
        
        content = f"""
BLOG POST: {blog_clean.get('title', 'N/A')}

Author: {blog_clean.get('author', 'N/A')}
Category: {blog_clean.get('category', 'N/A')}
Tags: {', '.join(blog_clean.get('tags', []))}

Excerpt: {blog_clean.get('excerpt', 'No excerpt available')}

Content:
{blog_clean.get('content', 'No content available')}

Related Location: {blog_clean.get('location', 'N/A')}
Created Date: {blog_clean.get('createdAt', 'N/A')}
"""
        
        blog_texts.append(content.strip())
        
        filename = f"{base_path}/blogs/blog_{blog_clean.get('_id', 'unknown')}.txt"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content.strip())
    
    with open(f"{base_path}/blogs/all_blogs.txt", 'w', encoding='utf-8') as f:
        f.write("\n\n" + "="*80 + "\n\n".join(blog_texts))
    
    print(f"✅ Đã tạo {len(blog_texts)} blog documents")
    return blog_texts

def create_guide_documents(guides, base_path):
    """Create documents for tour guides"""
    guide_texts = []
    
    for guide in guides:
        guide_clean = convert_objectid_to_string(guide)
        
        content = f"""
TOUR GUIDE: {guide_clean.get('name', 'N/A')}

Email: {guide_clean.get('email', 'N/A')}
Phone: {guide_clean.get('phone', 'N/A')}

Experience: {guide_clean.get('experience', 'N/A')} years
Specialties: {', '.join(guide_clean.get('specialties', []))}
Languages: {', '.join(guide_clean.get('languages', []))}

Biography:
{guide_clean.get('bio', 'No biography available')}

Rating: {guide_clean.get('rating', 'N/A')}/5
Operating Regions: {', '.join(guide_clean.get('regions', []))}

Hourly Rate: {guide_clean.get('hourlyRate', 'N/A')} VND/hour
"""
        
        guide_texts.append(content.strip())
        
        filename = f"{base_path}/guides/guide_{guide_clean.get('_id', 'unknown')}.txt"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content.strip())
    
    with open(f"{base_path}/guides/all_guides.txt", 'w', encoding='utf-8') as f:
        f.write("\n\n" + "="*80 + "\n\n".join(guide_texts))
    
    print(f"✅ Đã tạo {len(guide_texts)} guide documents")
    return guide_texts

def create_general_info(base_path):
    """Create general company information"""
    general_info = """
CMP TRAVEL COMPANY INFORMATION

CMP Travel is a premium travel company specializing in high-quality travel services in Vietnam and Southeast Asia.

MAIN SERVICES:
- Travel consulting and tour organization (domestic and international)
- Hotel booking with preferential rates
- Professional tour guide services
- Visa consulting and immigration procedures
- Travel vehicle rental services
- Travel insurance

KEY FEATURES:
- Experienced and professional tour guides
- Competitive and transparent pricing
- 24/7 customer service
- Guaranteed tour quality
- Online hotel booking support

CONTACT INFORMATION:
Website: cmp-travel.com
Email: info@cmp-travel.com
Hotline: 1900 1234
Address: 123 ABC Street, District 1, Ho Chi Minh City

COMPANY POLICIES:
- 100% refund if tour is cancelled 7 days in advance
- Guaranteed departure with minimum 10 guests
- Travel insurance for all customers
- 24/7 customer support throughout the journey
"""
    
    with open(f"{base_path}/general/company_info.txt", 'w', encoding='utf-8') as f:
        f.write(general_info.strip())
    
    print("✅ Đã tạo thông tin chung về công ty")

def main():
    """Hàm chính"""
    print("🚀 Bắt đầu trích xuất dữ liệu từ MongoDB...")
    
    # Kết nối MongoDB
    client, db = connect_mongodb()
    if db is None:
        return
    
    try:
        # Tạo cấu trúc thư mục
        base_path = create_knowledge_base_structure()
        print(f"📁 Đã tạo cấu trúc thư mục: {base_path}")
        
        # Trích xuất dữ liệu
        print("\n📊 Trích xuất dữ liệu từ database...")
        tours = extract_tours_data(db)
        hotels = extract_hotels_data(db)
        blogs = extract_blogs_data(db)
        guides = extract_guides_data(db)
        
        # Tạo knowledge base documents
        print("\n📝 Tạo knowledge base documents...")
        create_tour_documents(tours, base_path)
        create_hotel_documents(hotels, base_path)
        create_blog_documents(blogs, base_path)
        create_guide_documents(guides, base_path)
        create_general_info(base_path)
        
        # Tạo file tổng hợp
        summary = f"""
TỔNG KẾT KNOWLEDGE BASE
=======================

Ngày tạo: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Dữ liệu đã trích xuất:
- Tours: {len(tours)} items
- Hotels: {len(hotels)} items  
- Blogs: {len(blogs)} items
- Guides: {len(guides)} items

Tổng cộng: {len(tours) + len(hotels) + len(blogs) + len(guides)} documents

Cấu trúc thư mục:
- {base_path}/tours/ - Thông tin các tour du lịch
- {base_path}/hotels/ - Thông tin khách sạn
- {base_path}/blogs/ - Bài viết du lịch
- {base_path}/guides/ - Thông tin hướng dẫn viên
- {base_path}/general/ - Thông tin chung về công ty
"""
        
        with open(f"{base_path}/SUMMARY.txt", 'w', encoding='utf-8') as f:
            f.write(summary)
        
        print(f"\n✅ Hoàn thành! Knowledge base đã được tạo tại: {base_path}")
        print(f"📊 Tổng cộng: {len(tours) + len(hotels) + len(blogs) + len(guides)} documents")
        
    finally:
        client.close()
        print("🔐 Đã đóng kết nối MongoDB")

if __name__ == "__main__":
    main()