/**
 * PayOS Integration - Payment Gateway
 * Website: https://payos.vn/
 * Docs: https://payos.vn/docs/
 * 
 * ✅ MIỄN PHÍ vĩnh viễn
 * ✅ Hỗ trợ 30+ ngân hàng
 * ✅ Webhook realtime
 * ✅ QR động với VietQR
 */

const axios = require('axios');
const crypto = require('crypto');

class PayOSService {
    constructor() {
        // ⚠️ Credentials từ https://payos.vn/portal/settings/api-keys
        this.clientId = process.env.PAYOS_CLIENT_ID || 'YOUR_CLIENT_ID';
        this.apiKey = process.env.PAYOS_API_KEY || 'YOUR_API_KEY';
        this.checksumKey = process.env.PAYOS_CHECKSUM_KEY || 'YOUR_CHECKSUM_KEY';
        
        this.baseURL = 'https://api-merchant.payos.vn/v2';
    }

    /**
     * Tạo payment link với QR code
     */
    async createPaymentLink(orderData) {
        try {
            const {
                orderCode,      // Unique order code
                amount,         // Số tiền (VND)
                description,    // Mô tả giao dịch
                returnUrl,      // URL redirect sau khi thanh toán
                cancelUrl       // URL khi user cancel
            } = orderData;

            const data = {
                orderCode: orderCode,
                amount: amount,
                description: description,
                buyerName: orderData.buyerName || '',
                buyerEmail: orderData.buyerEmail || '',
                buyerPhone: orderData.buyerPhone || '',
                buyerAddress: orderData.buyerAddress || '',
                items: orderData.items || [],
                cancelUrl: cancelUrl,
                returnUrl: returnUrl
            };

            // Generate signature
            const signature = this.generateSignature(data);

            const response = await axios.post(`${this.baseURL}/payment-requests`, data, {
                headers: {
                    'x-client-id': this.clientId,
                    'x-api-key': this.apiKey,
                    'x-partner-code': signature,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.code === '00') {
                return {
                    success: true,
                    checkoutUrl: response.data.data.checkoutUrl,
                    qrCode: response.data.data.qrCode,
                    paymentLinkId: response.data.data.paymentLinkId
                };
            }

            return {
                success: false,
                message: response.data.desc
            };

        } catch (error) {
            console.error('❌ PayOS create payment error:', error.response?.data || error.message);
            throw new Error('Không thể tạo payment link: ' + (error.response?.data?.desc || error.message));
        }
    }

    /**
     * Check trạng thái thanh toán
     */
    async getPaymentInfo(orderCode) {
        try {
            const response = await axios.get(`${this.baseURL}/payment-requests/${orderCode}`, {
                headers: {
                    'x-client-id': this.clientId,
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.code === '00') {
                const payment = response.data.data;
                return {
                    success: true,
                    status: payment.status, // PENDING, PAID, CANCELLED
                    amount: payment.amount,
                    description: payment.description,
                    transactionDateTime: payment.transactionDateTime,
                    accountNumber: payment.accountNumber,
                    reference: payment.reference
                };
            }

            return {
                success: false,
                message: response.data.desc
            };

        } catch (error) {
            console.error('❌ PayOS get payment error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(data, signature) {
        try {
            const sortedData = this.sortObject(data);
            const dataStr = JSON.stringify(sortedData);
            
            const expectedSignature = crypto
                .createHmac('sha256', this.checksumKey)
                .update(dataStr)
                .digest('hex');

            return signature === expectedSignature;
        } catch (error) {
            console.error('Verify webhook error:', error);
            return false;
        }
    }

    /**
     * Generate signature for API request
     */
    generateSignature(data) {
        const sortedData = this.sortObject(data);
        const dataStr = JSON.stringify(sortedData);
        
        return crypto
            .createHmac('sha256', this.checksumKey)
            .update(dataStr)
            .digest('hex');
    }

    /**
     * Sort object keys alphabetically
     */
    sortObject(obj) {
        return Object.keys(obj)
            .sort()
            .reduce((result, key) => {
                result[key] = obj[key];
                return result;
            }, {});
    }

    /**
     * Tạo VietQR với PayOS
     */
    generateVietQR(bankCode, accountNumber, accountName, amount, content) {
        // PayOS tự động tạo QR khi create payment link
        // Hoặc dùng VietQR API trực tiếp
        const template = 'compact2';
        const baseURL = 'https://img.vietqr.io/image';
        
        const url = `${baseURL}/${bankCode}-${accountNumber}-${template}.jpg?` +
            `amount=${amount}` +
            `&addInfo=${encodeURIComponent(content)}` +
            `&accountName=${encodeURIComponent(accountName)}`;
        
        return url;
    }
}

module.exports = new PayOSService();
