/**
 * CASSO BANKING INTEGRATION CONFIG
 * =================================
 * Casso.vn - Banking aggregator for Vietnam
 * Real-time transaction webhook
 * 
 * Setup Instructions:
 * 1. Register at https://casso.vn
 * 2. Link your bank account (VCB, TCB, MB, etc.)
 * 3. Get API key from Settings
 * 4. Add webhook URL: https://your-domain.com/api/wallet/webhook/casso
 * 5. Copy API credentials to .env file
 */

module.exports = {
  // Casso API Configuration
  apiUrl: 'https://oauth.casso.vn/v2',
  apiKey: process.env.CASSO_API_KEY || 'YOUR_CASSO_API_KEY',
  
  // Webhook Security
  webhookSecret: process.env.CASSO_WEBHOOK_SECRET || 'YOUR_WEBHOOK_SECRET',
  
  // Bank Account Info (will be displayed to users)
  bankAccount: {
    bankName: process.env.BANK_NAME || 'MB Bank',
    accountNumber: process.env.BANK_ACCOUNT_NUMBER || '1234567890',
    accountName: process.env.BANK_ACCOUNT_NAME || 'CONG TY TNHH CMP TRAVEL',
    branch: process.env.BANK_BRANCH || 'Ho Chi Minh',
  },
  
  // Transaction Settings
  minAmount: 10000, // Minimum 10,000 VND
  maxAmount: 50000000, // Maximum 50,000,000 VND
  
  // Exchange Rate (VND to USD for wallet)
  exchangeRate: 1, // 1 VND = 1 USD (as requested)
  
  // Transaction Description Format
  // Format: CMPTRAVEL{userId}_{timestamp}
  descriptionPrefix: 'CMPTRAVEL',
  
  // QR Code Settings
  qrCodeTemplate: 'compact2', // compact2 is recommended for bank transfer
  
  // Webhook retry settings
  webhookRetries: 3,
  webhookTimeout: 30000, // 30 seconds
  
  // Auto-check interval (fallback if webhook fails)
  autoCheckInterval: 30000, // 30 seconds
  autoCheckEnabled: true,
};
