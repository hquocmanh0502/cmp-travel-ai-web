const mongoose = require('mongoose');

/**
 * CMP WALLET MODEL
 * ================
 * Future feature: Virtual wallet for CMP Travel users
 * Users can deposit money and use it for bookings
 */

const cmpWalletSchema = new mongoose.Schema({
  // User Reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Wallet Balance
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Currency
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'VND', 'EUR']
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'frozen', 'closed'],
    default: 'active'
  },
  
  // Security
  pin: {
    type: String,
    select: false // Don't return in queries
  },
  
  // Transaction History (embedded)
  transactions: [{
    type: {
      type: String,
      enum: ['deposit', 'withdrawal', 'payment', 'refund', 'bonus'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    balanceBefore: Number,
    balanceAfter: Number,
    description: String,
    reference: String, // Booking ID, Transaction ID, etc
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    completedAt: Date
  }],
  
  // Limits
  dailyLimit: {
    type: Number,
    default: 10000 // $10,000 per day
  },
  
  monthlyLimit: {
    type: Number,
    default: 50000 // $50,000 per month
  },
  
  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  
  verificationLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 3
    // 0: Unverified (max $100)
    // 1: Email verified (max $1,000)
    // 2: Phone + ID verified (max $10,000)
    // 3: Full KYC (unlimited)
  },
  
  // Auto-reload (future feature)
  autoReload: {
    enabled: {
      type: Boolean,
      default: false
    },
    minBalance: Number,
    reloadAmount: Number,
    paymentMethod: String
  },
  
  // Metadata
  lastActivityDate: Date,
  totalDeposited: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  }
  
}, {
  timestamps: true
});

// Virtual: Available balance (considering pending transactions)
cmpWalletSchema.virtual('availableBalance').get(function() {
  const pendingDeductions = this.transactions
    .filter(t => t.type === 'payment' && t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);
  
  return this.balance - pendingDeductions;
});

// Method: Add funds
cmpWalletSchema.methods.deposit = async function(amount, description, reference) {
  if (amount <= 0) {
    throw new Error('Deposit amount must be positive');
  }
  
  const balanceBefore = this.balance;
  this.balance += amount;
  this.totalDeposited += amount;
  
  this.transactions.push({
    type: 'deposit',
    amount: amount,
    balanceBefore: balanceBefore,
    balanceAfter: this.balance,
    description: description || 'Deposit',
    reference: reference,
    status: 'completed',
    completedAt: new Date()
  });
  
  this.lastActivityDate = new Date();
  await this.save();
  
  return this;
};

// Method: Make payment
cmpWalletSchema.methods.makePayment = async function(amount, bookingId, description) {
  if (amount <= 0) {
    throw new Error('Payment amount must be positive');
  }
  
  if (this.balance < amount) {
    throw new Error('Insufficient balance');
  }
  
  if (this.status !== 'active') {
    throw new Error('Wallet is not active');
  }
  
  const balanceBefore = this.balance;
  this.balance -= amount;
  this.totalSpent += amount;
  
  this.transactions.push({
    type: 'payment',
    amount: amount,
    balanceBefore: balanceBefore,
    balanceAfter: this.balance,
    description: description || `Payment for booking ${bookingId}`,
    reference: bookingId,
    status: 'completed',
    completedAt: new Date()
  });
  
  this.lastActivityDate = new Date();
  await this.save();
  
  return {
    success: true,
    transactionId: this.transactions[this.transactions.length - 1]._id,
    balanceBefore,
    balanceAfter: this.balance,
    amountDeducted: amount
  };
};

// Method: Refund
cmpWalletSchema.methods.refund = async function(amount, bookingId, description) {
  if (amount <= 0) {
    throw new Error('Refund amount must be positive');
  }
  
  const balanceBefore = this.balance;
  this.balance += amount;
  
  this.transactions.push({
    type: 'refund',
    amount: amount,
    balanceBefore: balanceBefore,
    balanceAfter: this.balance,
    description: description || `Refund for booking ${bookingId}`,
    reference: bookingId,
    status: 'completed',
    completedAt: new Date()
  });
  
  this.lastActivityDate = new Date();
  await this.save();
  
  return this;
};

// Method: Get transaction history
cmpWalletSchema.methods.getTransactionHistory = function(limit = 50, type = null) {
  let transactions = this.transactions;
  
  if (type) {
    transactions = transactions.filter(t => t.type === type);
  }
  
  return transactions
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
};

// Index for quick user lookup
cmpWalletSchema.index({ userId: 1 });
cmpWalletSchema.index({ status: 1 });
cmpWalletSchema.index({ 'transactions.createdAt': -1 });

// Ensure virtuals are included
cmpWalletSchema.set('toJSON', { virtuals: true });
cmpWalletSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('CMPWallet', cmpWalletSchema);
