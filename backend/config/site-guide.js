// Huong dan dung website cho chatbot (cong cu site_help - chat/shared/tools.js).
// MOT cho duy nhat mo ta trang nao lam gi; sua giao dien thi sua o day.
// Thong tin lien he lay dung tu frontend/contact.html.

const SITE_GUIDE = [
  {
    id: 'wallet_topup', title: 'Top up your CMP wallet', link: 'profile.html#wallet',
    keywords: ['wallet', 'top up', 'topup', 'add money', 'deposit', 'balance', 'nạp', 'ví', 'tiền'],
    steps: [
      'Sign in, open Profile and go to the Wallet section.',
      'Click "Top Up", pick a preset amount or type a custom amount.',
      'Pay by bank transfer: scan the QR code shown (the only top-up method).',
      'Your balance updates after the transfer is confirmed. Bookings are paid from this wallet.'
    ]
  },
  {
    id: 'pay_booking', title: 'Pay for a booking', link: 'my-bookings.html',
    keywords: ['pay', 'payment', 'checkout', 'thanh toán', 'trả tiền'],
    steps: [
      'Open My Bookings. Unpaid bookings show "Pay Now" (or "Pay Trip" for a Smart Tour combined trip, paid once for all tours).',
      'Payment is taken from your CMP wallet; if your wallet PIN is on, enter it.',
      'Not enough balance? The payment window shows the shortage and a "Top Up Wallet" button.'
    ]
  },
  {
    id: 'book_tour', title: 'Book a tour', link: 'destination.html',
    keywords: ['book', 'booking', 'reserve', 'how to book', 'đặt tour', 'đặt'],
    steps: [
      'Open Destinations and choose a tour (or use a "Book" button from this chat).',
      'On the tour page pick a scheduled departure and the number of adults / children.',
      'Choose a hotel tier and a guide, then fill in your details and rooms on the Reservation page.',
      'Submit, then pay from My Bookings. You must be signed in to book.'
    ]
  },
  {
    id: 'smart_tour', title: 'Use Smart Tour', link: 'smart-tour.html',
    keywords: ['smart tour', 'smarttour', 'planner', 'plan', 'combine', 'ghép tour', 'lập kế hoạch'],
    steps: [
      'Open Smart Tour and enter your departure window, number of days, budget per person and travellers (with children\'s ages).',
      'Optionally choose interests, pace, physical level, "Must include" cities and how many tours to combine (1-3).',
      'Click "Find my trip": it combines single tours or 2-3 connected tours using real departures, travel times and prices, and explains each score.',
      'Click "Book this trip" on a result to book the whole trip and pay once. I can also plan it for you right here in the chat.'
    ]
  },
  {
    id: 'cancel_booking', title: 'Cancel a booking', link: 'my-bookings.html',
    keywords: ['cancel', 'refund', 'huỷ', 'hủy', 'hoàn tiền'],
    steps: [
      'Open My Bookings and click "Cancel" on an upcoming booking; the confirmation shows the refund before you confirm.',
      'Wallet payments are refunded by days before departure (ask me for the exact policy).',
      'In a combined trip each tour is cancelled separately.'
    ]
  },
  {
    id: 'my_bookings', title: 'See your bookings and travel history', link: 'my-bookings.html',
    keywords: ['my bookings', 'my orders', 'history', 'travel history', 'đơn', 'lịch sử'],
    steps: [
      'My Bookings lists every booking with its status, payment and actions (pay, cancel, review).',
      'Travel History (travel-history.html) shows trips you have completed.'
    ]
  },
  {
    id: 'destinations', title: 'Browse all tours', link: 'destination.html',
    keywords: ['destinations', 'all tours', 'tour list', 'browse', 'danh sách tour'],
    steps: ['Destinations lists all 36 tours with filters; open a tour for its itinerary, photos, departures and reviews.']
  },
  {
    id: 'compare', title: 'Compare tours', link: 'compare.html',
    keywords: ['compare', 'so sánh'],
    steps: ['Click "Compare" on tours in Destinations or a tour page; the compare bar appears at the bottom.', 'Open Compare Tours to see them side by side (price, days, highlights).']
  },
  {
    id: 'wishlist', title: 'Save tours to your wishlist', link: 'my-wishlist.html',
    keywords: ['wishlist', 'favorite', 'favourite', 'save', 'yêu thích'],
    steps: ['Click the heart icon on a tour to save it; see saved tours in Wishlist (sign in required).']
  },
  {
    id: 'gallery', title: 'Photo gallery', link: 'gallery.html',
    keywords: ['gallery', 'photos', 'pictures', 'images', 'ảnh', 'thư viện ảnh'],
    steps: ['Open Gallery from the top menu to browse travel photos; click a photo to view it larger.']
  },
  {
    id: 'blog', title: 'Travel blog', link: 'blog.html',
    keywords: ['blog', 'articles', 'posts', 'stories', 'bài viết'],
    steps: ['Open Blog from the top menu for destination guides and travel tips. Ask me about a place and I will find the matching article.']
  },
  {
    id: 'contact', title: 'Contact CMP Travel', link: 'contact.html',
    keywords: ['contact', 'phone', 'email', 'address', 'hotline', 'support', 'liên hệ', 'địa chỉ', 'số điện thoại'],
    steps: [
      'Address: Phenikaa University, Yen Nghia, Ha Dong, Ha Noi.',
      'Phone / booking / hotline: +84 123 456 789.',
      'Email: eee@phenikaa-uni.edu.vn.',
      'Or send a message with the form on the Contact page.'
    ]
  },
  {
    id: 'about', title: 'About CMP Travel', link: 'aboutus.html',
    keywords: ['about', 'company', 'who are you', 'giới thiệu', 'về chúng tôi'],
    steps: ['CMP Travel sells guided group tours to 36 cities in Europe, Asia and North America. The About Us page tells the company story.']
  },
  {
    id: 'account', title: 'Account: register, sign in, profile', link: 'login.html',
    keywords: ['account', 'register', 'sign up', 'signup', 'login', 'log in', 'sign in', 'password', 'profile', 'đăng ký', 'đăng nhập', 'tài khoản'],
    steps: [
      'Register on create_acc.html, then sign in on login.html.',
      'Profile lets you edit your details, manage the wallet and see your VIP level.',
      'AI Preferences (preferences.html) sets your travel preferences for tour recommendations.'
    ]
  },
  {
    id: 'vip', title: 'VIP membership', link: 'profile.html',
    keywords: ['vip', 'membership', 'member', 'level', 'tier', 'hạng', 'thành viên'],
    steps: ['Your VIP level grows with the total you have paid and gives a discount on tours at booking. See your level and progress in Profile (ask me for the tier table).']
  }
];

module.exports = { SITE_GUIDE };
