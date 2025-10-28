/**
 * Bank Transfer Payment Configuration
 * Chuyển khoản ngân hàng trực tiếp - TIỀN THẬT
 * 
 * User chuyển khoản → Admin check → Duyệt thủ công
 */

module.exports = {
    // Thông tin tài khoản nhận tiền
    bankAccounts: [
        {
            bankName: 'MB Bank',
            bankCode: 'MB',
            accountNumber: '0344868243',
            accountName: 'HOANG QUOC MANH',
            branch: 'Ha Noi'
        }
    ],
    
    // Content format
    contentFormat: 'CMPTOPUP {userId} {orderId}',
    
    // Minimum amount
    minAmount: 10000,
    
    // Auto-verify settings
    autoVerify: false,
    verifyTimeout: 30 * 60 * 1000,
    
    // VietQR settings (sử dụng VietQR API để tạo QR động)
    useVietQR: true,
    vietQRTemplate: 'compact2' // 'compact', 'compact2', 'qr_only', 'print'
};
