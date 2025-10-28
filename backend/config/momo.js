/**
 * MoMo Payment Gateway Configuration
 * Test Environment - MoMo Developer
 * Documentation: https://developers.momo.vn/
 */

module.exports = {
    // MoMo Test Credentials (Sandbox)
    partnerCode: 'MOMO',
    accessKey: 'F8BBA842ECF85',
    secretKey: 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
    
    // API Endpoints
    endpoint: 'https://test-payment.momo.vn/v2/gateway/api/create',
    queryEndpoint: 'https://test-payment.momo.vn/v2/gateway/api/query',
    
    // Callback URLs (Update these with your domain)
    redirectUrl: 'http://localhost:3000/payment-result.html',
    ipnUrl: 'http://localhost:3000/api/wallet/momo-ipn',
    
    // Request type
    // Options:
    // - 'captureWallet': MoMo app payment (no QR in test env)
    // - 'payWithMethod': Show QR code (requires production env)
    requestType: 'captureWallet', // hoặc 'payWithMethod' cho QR
    
    // Extra info
    extraData: '',
    autoCapture: true,
    lang: 'vi',
    
    // Rate conversion (for demo)
    // 1 USD = 1 VND (để demo dễ)
    conversionRate: 1
};
