/**
 * Casso.vn Integration - Tự động nhận thông báo chuyển khoản
 * Website: https://casso.vn/
 * 
 * CÁCH HOẠT ĐỘNG:
 * 1. Đăng ký tài khoản Casso.vn (MIỄN PHÍ)
 * 2. Liên kết tài khoản ngân hàng (qua SMS hoặc Email)
 * 3. Casso tự động đọc thông báo chuyển khoản
 * 4. Gọi webhook của bạn khi có tiền vào
 * 
 * PHÍ:
 * - Miễn phí: 100 giao dịch/tháng
 * - Pro: 99,000đ/tháng (unlimited)
 */

const axios = require('axios');

class CassoService {
    constructor() {
        // ⚠️ API Key lấy từ https://casso.vn/developer
        this.apiKey = 'YOUR_CASSO_API_KEY'; // Ví dụ: 'AK_CS.xxxxx'
        this.baseURL = 'https://oauth.casso.vn/v2';
    }

    /**
     * Lấy danh sách giao dịch
     */
    async getTransactions(fromDate, toDate) {
        try {
            const response = await axios.get(`${this.baseURL}/transactions`, {
                headers: {
                    'Authorization': `Apikey ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    fromDate: fromDate, // Format: YYYY-MM-DD
                    toDate: toDate,
                    pageSize: 100
                }
            });

            if (response.data.error === 0) {
                return response.data.data.records || [];
            }
            return [];
        } catch (error) {
            console.error('❌ Casso get transactions error:', error.message);
            return [];
        }
    }

    /**
     * Check giao dịch theo nội dung
     */
    async checkTransferByContent(content, amount, timeWindow = 30) {
        try {
            const now = new Date();
            const fromDate = new Date(now.getTime() - timeWindow * 60 * 1000);
            
            const fromDateStr = this.formatDate(fromDate);
            const toDateStr = this.formatDate(now);

            const transactions = await this.getTransactions(fromDateStr, toDateStr);

            // Tìm giao dịch khớp
            const matchedTx = transactions.find(tx => {
                const txDescription = (tx.description || '').toUpperCase();
                const txAmount = parseFloat(tx.amount || 0);
                
                return txDescription.includes(content.toUpperCase()) && 
                       Math.abs(txAmount - amount) < 1; // Cho phép sai số 1đ
            });

            if (matchedTx) {
                return {
                    found: true,
                    transaction: {
                        id: matchedTx.id,
                        tid: matchedTx.tid,
                        amount: matchedTx.amount,
                        description: matchedTx.description,
                        when: matchedTx.when,
                        bankSubAccId: matchedTx.bankSubAccId
                    }
                };
            }

            return { found: false };
        } catch (error) {
            console.error('❌ Check transfer error:', error.message);
            return { found: false, error: error.message };
        }
    }

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Verify webhook signature (khi Casso gửi webhook)
     */
    verifyWebhookSignature(data, signature) {
        // Implement signature verification
        // Documentation: https://docs.casso.vn/
        return true;
    }
}

module.exports = new CassoService();
