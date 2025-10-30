const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // User Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Tour Information
  tourId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
    required: true
  },
  
  // ✅ Store tour name for display (fallback if tour deleted)
  tourName: {
    type: String,
    default: 'Tour'
  },
  
  // Hotel Information
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    default: null
  },
  
  // ✅ Store hotel name for display (fallback if hotel deleted)
  hotelName: {
    type: String,
    default: 'No hotel selected'
  },
  
  // Dates
  checkinDate: {
    type: Date,
    required: true
  },
  checkoutDate: {
    type: Date,
    required: true
  },
  departureDate: {
    type: Date,
    required: true
  },
  bookingDate: {
    type: Date,
    default: Date.now
  },
  
  // Guest Information
  adults: {
    type: Number,
    required: true,
    min: 1,
    max: 20
  },
  children: {
    type: Number,
    default: 0,
    min: 0,
    max: 20
  },
  infants: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  
  // Room Selection with Validation
  rooms: {
    superior: {
      type: Number,
      default: 0,
      min: 0,
      max: 10
    },
    juniorDeluxe: {
      type: Number,
      default: 0,
      min: 0,
      max: 10
    },
    deluxe: {
      type: Number,
      default: 0,
      min: 0,
      max: 10
    },
    suite: {
      type: Number,
      default: 0,
      min: 0,
      max: 10
    },
    family: {
      type: Number,
      default: 0,
      min: 0,
      max: 10
    },
    president: {
      type: Number,
      default: 0,
      min: 0,
      max: 10
    }
  },
  
  // Services
  services: {
    meals: {
      breakfast: { type: Boolean, default: false },
      lunch: { type: Boolean, default: false },
      dinner: { type: Boolean, default: false }
    },
    transfer: {
      type: String,
      enum: ['none', 'airport', 'hotel', 'both'],
      default: 'none'
    },
    insurance: {
      type: Boolean,
      default: false
    },
    tourGuide: {
      type: Boolean,
      default: true
    }
  },
  
  // Customer Information
  customerInfo: {
    title: {
      type: String,
      enum: ['Mr', 'Mrs', 'Ms', 'Dr'],
      default: 'Mr'
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    specialRequests: {
      type: String,
      default: '',
      maxlength: 500
    }
  },
  
  // Pricing
  tourBaseCost: {
    type: Number,
    required: true,
    min: 0
  },
  accommodationCost: {
    type: Number,
    default: 0,
    min: 0
  },
  servicesCost: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // VIP Discount
  vipDiscount: {
    membershipLevel: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
      default: 'bronze'
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    originalAmount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Booking Status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  
  // Review tracking
  hasReviewed: {
    type: Boolean,
    default: false
  },
  reviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  
  // Payment
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid', 'refunded'],
    default: 'unpaid'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'credit_card', 'bank_transfer', 'paypal', 'cmp_wallet'], // ✅ Added CMP Wallet
    default: 'cash'
  },
  
  // ✅ CMP WALLET PAYMENT (Future Feature)
  cmpWalletPayment: {
    walletId: String,
    transactionId: String,
    transactionDate: Date,
    amountDeducted: Number,
    walletBalanceBefore: Number,
    walletBalanceAfter: Number,
    paymentConfirmed: {
      type: Boolean,
      default: false
    }
  },
  
  // Payment Details
  paymentDetails: {
    paidAmount: {
      type: Number,
      default: 0
    },
    paidAt: Date,
    paymentReference: String,
    paymentNote: String
  },
  
  // Validation Metadata
  roomValidation: {
    totalGuests: Number,
    totalRooms: Number,
    maxCapacity: Number,
    isValid: Boolean,
    validatedAt: Date
  },
  
  // Admin Notes
  adminNotes: {
    type: String,
    default: ''
  },
  
  // Cancellation
  cancellationDate: Date,
  cancellationReason: String
  
}, {
  timestamps: true
});

// Virtual for total guests
bookingSchema.virtual('totalGuests').get(function() {
  return this.adults + this.children + this.infants;
});

// Virtual for total rooms
bookingSchema.virtual('totalRooms').get(function() {
  return (
    this.rooms.superior +
    this.rooms.juniorDeluxe +
    this.rooms.deluxe +
    this.rooms.suite +
    this.rooms.family +
    this.rooms.president
  );
});

// Virtual for booking ID
bookingSchema.virtual('bookingId').get(function() {
  return 'BOOK' + this._id.toString().slice(-8).toUpperCase();
});

// Method to validate room capacity
bookingSchema.methods.validateRoomCapacity = function() {
  const ROOM_CAPACITY = {
    superior: 3,
    juniorDeluxe: 3,
    deluxe: 3,
    suite: 4,
    family: 4,
    president: 6
  };
  
  const totalGuests = this.adults + this.children + this.infants;
  const totalRooms = this.totalRooms;
  
  if (totalRooms === 0) {
    return {
      isValid: false,
      error: 'No rooms selected'
    };
  }
  
  // Calculate max capacity
  const maxCapacity = 
    (this.rooms.superior * ROOM_CAPACITY.superior) +
    (this.rooms.juniorDeluxe * ROOM_CAPACITY.juniorDeluxe) +
    (this.rooms.deluxe * ROOM_CAPACITY.deluxe) +
    (this.rooms.suite * ROOM_CAPACITY.suite) +
    (this.rooms.family * ROOM_CAPACITY.family) +
    (this.rooms.president * ROOM_CAPACITY.president);
  
  if (totalGuests > maxCapacity) {
    return {
      isValid: false,
      error: `Selected rooms can only accommodate ${maxCapacity} guests, but ${totalGuests} guests were specified`
    };
  }
  
  // ✅ Only warn if significantly under-roomed (more flexible)
  // Allow some flexibility for larger rooms (President, Suite, Family)
  // Only enforce if guests/room ratio > 4 (too crowded)
  const avgGuestsPerRoom = totalGuests / totalRooms;
  if (avgGuestsPerRoom > 4) {
    const suggestedMinRooms = Math.ceil(totalGuests / 3);
    return {
      isValid: false,
      error: `${totalGuests} guests in ${totalRooms} room(s) exceeds comfort level. Suggested: at least ${suggestedMinRooms} rooms`
    };
  }
  
  return {
    isValid: true,
    totalGuests,
    totalRooms,
    maxCapacity
  };
};

// Pre-save validation
bookingSchema.pre('save', function(next) {
  const validation = this.validateRoomCapacity();
  
  if (!validation.isValid) {
    return next(new Error(validation.error));
  }
  
  // Store validation metadata
  this.roomValidation = {
    totalGuests: validation.totalGuests,
    totalRooms: validation.totalRooms,
    maxCapacity: validation.maxCapacity,
    isValid: true,
    validatedAt: new Date()
  };
  
  next();
});

// Index for queries
bookingSchema.index({ userId: 1, bookingDate: -1 });
bookingSchema.index({ tourId: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ bookingDate: -1 });

// Ensure virtuals are included in JSON
bookingSchema.set('toJSON', { virtuals: true });
bookingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Booking', bookingSchema);
