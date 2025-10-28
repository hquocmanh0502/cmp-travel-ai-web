// Add sample blogs to database
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const Blog = require('./models/Blog');

const sampleBlogs = [
  {
    title: '10 Must-Visit Destinations in Vietnam',
    author: 'John Smith',
    excerpt: 'Discover the most breathtaking locations across Vietnam, from bustling cities to serene beaches.',
    content: `Vietnam is a country of stunning natural beauty and rich culture. Here are 10 destinations you absolutely must visit:

1. **Ha Long Bay** - UNESCO World Heritage Site with thousands of limestone islands
2. **Hoi An Ancient Town** - Charming old town with lantern-lit streets
3. **Ho Chi Minh City** - Vibrant metropolis with French colonial architecture
4. **Hanoi** - The capital city with 1000 years of history
5. **Sapa** - Mountainous region with terraced rice fields
6. **Phu Quoc Island** - Tropical paradise with pristine beaches
7. **Hue** - Ancient imperial capital with royal tombs
8. **Da Nang** - Modern coastal city with beautiful beaches
9. **Mekong Delta** - Lush river delta with floating markets
10. **Ninh Binh** - "Ha Long Bay on land" with stunning karst landscapes

Each destination offers unique experiences and unforgettable memories!`,
    image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800',
    category: 'Destination Guides',
    tags: ['vietnam', 'travel', 'destinations', 'tourism'],
    status: 'published',
    publishedDate: new Date('2025-01-15'),
    views: 1250
  },
  {
    title: 'Budget Travel Tips for Southeast Asia',
    author: 'Sarah Johnson',
    excerpt: 'Learn how to travel across Southeast Asia on a budget without compromising on experiences.',
    content: `Traveling Southeast Asia doesn't have to break the bank. Here are my top budget tips:

**Accommodation**
- Stay in hostels or guesthouses ($5-15/night)
- Use booking platforms for deals
- Consider Couchsurfing for free stays

**Transportation**
- Take local buses instead of tourist buses
- Use ride-sharing apps like Grab
- Rent motorbikes for flexibility

**Food**
- Eat at street food stalls
- Try local markets
- Avoid tourist restaurants

**Activities**
- Free walking tours in major cities
- Visit temples and markets
- Beach days and hiking

With these tips, you can travel comfortably on $30-40 per day!`,
    image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800',
    category: 'Budget Travel',
    tags: ['budget', 'backpacking', 'southeast-asia', 'money-saving'],
    status: 'published',
    publishedDate: new Date('2025-01-20'),
    views: 890
  },
  {
    title: 'Best Street Food in Thailand',
    author: 'Mike Chen',
    excerpt: 'A food lover\'s guide to the most delicious street food you must try in Thailand.',
    content: `Thailand is a paradise for food lovers! Here are the must-try street foods:

1. **Pad Thai** - Iconic stir-fried noodles
2. **Som Tam** - Spicy green papaya salad
3. **Mango Sticky Rice** - Sweet dessert perfection
4. **Tom Yum Goong** - Hot and sour shrimp soup
5. **Grilled Skewers** - Moo ping (pork) and gai yang (chicken)
6. **Roti** - Thai-style pancakes with various toppings
7. **Boat Noodles** - Rich beef or pork noodle soup
8. **Khao Niao Mamuang** - Coconut sticky rice with mango

Don't miss the night markets for the best street food experience!`,
    image: 'https://images.unsplash.com/photo-1559181567-c3190ca9959b?w=800',
    category: 'Food & Cuisine',
    tags: ['thailand', 'food', 'street-food', 'cuisine'],
    status: 'published',
    publishedDate: new Date('2025-01-25'),
    views: 756
  },
  {
    title: 'Solo Travel Safety Guide for Women',
    author: 'Emily Rodriguez',
    excerpt: 'Essential safety tips and advice for women traveling solo in Asia.',
    content: `Solo female travel can be incredibly rewarding! Here's how to stay safe:

**Before You Go**
- Research your destination thoroughly
- Share your itinerary with family
- Get travel insurance
- Register with your embassy

**While Traveling**
- Trust your instincts
- Dress modestly in conservative areas
- Avoid walking alone at night
- Keep valuables secure
- Stay in well-reviewed accommodations
- Join group tours or activities

**Useful Apps**
- TripIt for itinerary management
- Maps.me for offline maps
- WhatsApp for communication
- Uber/Grab for safe transportation

Remember: millions of women travel solo successfully every year. Be smart, be aware, and enjoy your adventure!`,
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800',
    category: 'Solo Travel',
    tags: ['solo-travel', 'women-travel', 'safety', 'tips'],
    status: 'published',
    publishedDate: new Date('2025-02-01'),
    views: 1120
  },
  {
    title: 'Photography Guide: Capturing Stunning Travel Photos',
    author: 'David Lee',
    excerpt: 'Master the art of travel photography with these professional tips and techniques.',
    content: `Take your travel photos to the next level with these tips:

**Equipment**
- DSLR or mirrorless camera
- Wide-angle lens (16-35mm)
- Prime lens (50mm)
- Tripod for low light
- Extra batteries and memory cards

**Composition**
- Rule of thirds
- Leading lines
- Frame within frame
- Golden hour lighting
- Include people for scale

**Technical Tips**
- Shoot in RAW format
- Use manual mode when possible
- Bracket exposures for HDR
- Focus on storytelling
- Capture local culture

**Post-Processing**
- Lightroom for editing
- Adjust exposure and contrast
- Enhance colors subtly
- Remove distractions
- Maintain authenticity

Practice makes perfect - keep shooting!`,
    image: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800',
    category: 'Photography',
    tags: ['photography', 'tips', 'camera', 'travel-photos'],
    status: 'published',
    publishedDate: new Date('2025-02-05'),
    views: 634
  },
  {
    title: 'Cultural Etiquette in Japan',
    author: 'Yuki Tanaka',
    excerpt: 'Understanding Japanese customs and etiquette for a respectful travel experience.',
    content: `Respect Japanese culture with these important etiquette tips:

**Greetings**
- Bow when meeting people
- Remove shoes indoors
- Use both hands when exchanging items

**Dining**
- Say "itadakimasu" before eating
- Don't stick chopsticks upright in rice
- Slurp noodles (it's polite!)
- Finish all your food

**Public Behavior**
- Don't talk loudly on trains
- Stand on the left on escalators
- No eating while walking
- Queue properly

**Temples & Shrines**
- Bow at entrance gates
- Purify hands at water basin
- Don't take photos where prohibited
- Be quiet and respectful

Following these customs will earn you respect and enhance your experience!`,
    image: 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=800',
    category: 'Culture & Tradition',
    tags: ['japan', 'culture', 'etiquette', 'customs'],
    status: 'draft',
    publishedDate: new Date('2025-02-10'),
    views: 0
  }
];

async function addSampleBlogs() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Clear existing blogs (optional)
    await Blog.deleteMany({});
    console.log('🗑️  Cleared existing blogs\n');

    // Insert sample blogs
    const result = await Blog.insertMany(sampleBlogs);
    console.log(`✅ Added ${result.length} sample blogs:\n`);
    
    result.forEach((blog, index) => {
      console.log(`${index + 1}. ${blog.title}`);
      console.log(`   Author: ${blog.author}`);
      console.log(`   Category: ${blog.category}`);
      console.log(`   Status: ${blog.status}`);
      console.log(`   Views: ${blog.views}\n`);
    });

    console.log('🎉 Sample blogs added successfully!');
    
  } catch (error) {
    console.error('❌ Error adding sample blogs:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

addSampleBlogs();
