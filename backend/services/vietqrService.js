/**
 * VietQR Service - Tạo QR Code động với nội dung chuyển khoản
 * API: https://vietqr.io/
 * 
 * MIỄN PHÍ - Không cần đăng ký!
 */

class VietQRService {
    constructor() {
        this.baseURL = 'https://img.vietqr.io/image';
    }

    /**
     * Tạo URL cho QR code
     * @param {Object} params
     * @param {string} params.bankCode - Mã ngân hàng (VD: 'MB', 'VCB', 'TCB')
     * @param {string} params.accountNumber - Số tài khoản
     * @param {string} params.accountName - Tên chủ tài khoản
     * @param {number} params.amount - Số tiền
     * @param {string} params.content - Nội dung chuyển khoản
     * @returns {string} URL của QR code
     */
    generateQRUrl(params) {
        const {
            bankCode,
            accountNumber,
            accountName,
            amount,
            content
        } = params;

        // VietQR URL format
        // https://img.vietqr.io/image/{BANK_CODE}-{ACCOUNT_NUMBER}-{TEMPLATE}.jpg
        // ?amount={AMOUNT}&addInfo={CONTENT}&accountName={ACCOUNT_NAME}

        const template = 'compact2'; // hoặc 'compact', 'qr_only', 'print'
        
        const url = `${this.baseURL}/${bankCode}-${accountNumber}-${template}.jpg?` +
            `amount=${amount}` +
            `&addInfo=${encodeURIComponent(content)}` +
            `&accountName=${encodeURIComponent(accountName)}`;

        return url;
    }

    /**
     * Tạo QR cho nhiều ngân hàng
     */
    generateMultiBankQR(banks, amount, content) {
        return banks.map(bank => ({
            bankCode: bank.bankCode,
            bankName: bank.bankName,
            qrUrl: this.generateQRUrl({
                bankCode: bank.bankCode,
                accountNumber: bank.accountNumber,
                accountName: bank.accountName,
                amount: amount,
                content: content
            })
        }));
    }
}

module.exports = new VietQRService();
