/**
 * MoMo Payment Gateway Configuration - PRODUCTION
 * Documentation: https://developers.momo.vn/
 * 
 * ⚠️ IMPORTANT: 
 * - Thay YOUR_PARTNER_CODE, YOUR_ACCESS_KEY, YOUR_SECRET_KEY bằng credentials thật
 * - Credentials lấy từ https://business.momo.vn/
 * - KHÔNG commit file này lên GitHub!
 */

module.exports = {
    // MoMo Production Credentials
    // ⚠️ Thay bằng credentials thật từ MoMo Business
    partnerCode: 'YOUR_PARTNER_CODE',  // Ví dụ: 'MOMO12345'
    accessKey: 'YOUR_ACCESS_KEY',      // Ví dụ: 'A1B2C3D4E5F6'
    secretKey: 'YOUR_SECRET_KEY',      // Ví dụ: 'X1Y2Z3...'
    
    // Production API Endpoints
    endpoint: 'https://payment.momo.vn/v2/gateway/api/create',
    queryEndpoint: 'https://payment.momo.vn/v2/gateway/api/query',
    
    // Callback URLs
    // ⚠️ Phải là domain public (không dùng localhost)
    // Ví dụ: https://cmp-travel.com hoặc https://yourdomain.vercel.app
    redirectUrl: 'https://YOUR_DOMAIN/payment-result.html',
    ipnUrl: 'https://YOUR_DOMAIN/api/wallet/momo-ipn',
    
    // Request type
    // - 'captureWallet': Thanh toán qua ví MoMo
    // - 'payWithMethod': Hiển thị QR code để quét
    requestType: 'captureWallet',
    
    // Extra info
    extraData: '',
    autoCapture: true,
    lang: 'vi',
    
    // Currency conversion
    // Production nên dùng tỷ giá thật: 1 USD ≈ 25,000 VND
    conversionRate: 25000
};
