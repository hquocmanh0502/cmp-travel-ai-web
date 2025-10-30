/**
 * PAYOS PAYMENT GATEWAY CONFIG
 * ============================
 * PayOS - Vietnamese payment gateway with VietQR support
 * https://payos.vn
 * 
 * Setup Instructions:
 * 1. Register at https://my.payos.vn
 * 2. Get API credentials (Client ID, API Key, Checksum Key)
 * 3. Setup webhook URL in PayOS dashboard
 * 4. Add credentials to .env file
 * 
 * Flow:
 * 1. Create payment link -> Get QR code
 * 2. User scans QR -> Pays via banking app
 * 3. PayOS sends webhook -> Auto update wallet
 * 4. Return to success page
 */

module.exports = {
  // PayOS API Configuration
  apiUrl: 'https://api-merchant.payos.vn/v2',
  clientId: process.env.PAYOS_CLIENT_ID || '',
  apiKey: process.env.PAYOS_API_KEY || '',
  checksumKey: process.env.PAYOS_CHECKSUM_KEY || '',
  
  // Webhook Configuration
  webhookUrl: process.env.PAYOS_WEBHOOK_URL || '',
  
  // Return URLs (after payment)
  returnUrl: process.env.PAYOS_RETURN_URL || 'http://localhost:3000/payment-result.html',
  cancelUrl: process.env.PAYOS_CANCEL_URL || 'http://localhost:3000/profile.html',
  
  // Transaction Settings
  transactionSettings: {
    minAmount: 10000,        // Minimum 10,000 VND
    maxAmount: 50000000,     // Maximum 50,000,000 VND (50M)
    currency: 'VND',
    exchangeRate: 1,         // 1 VND = 1 USD (wallet currency)
  },
  
  // Order Settings
  orderCodePrefix: 'CMPTRAVEL',  // Prefix for order codes
  description: 'Nap tien vi CMP Travel', // Payment description
  
  // Payment Methods
  paymentMethods: ['VIETQR'], // Only use VietQR for bank transfer
};
