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

const { PayOS } = require('@payos/node');
const crypto = require('crypto');
const payosConfig = require('../config/payos');

class PayOSService {
    constructor() {
        // Validate environment variables
        const clientId = process.env.PAYOS_CLIENT_ID || payosConfig.clientId;
        const apiKey = process.env.PAYOS_API_KEY || payosConfig.apiKey;
        const checksumKey = process.env.PAYOS_CHECKSUM_KEY || payosConfig.checksumKey;
        
        if (!clientId || !apiKey || !checksumKey) {
            console.warn('⚠️  PayOS credentials missing! Payment features will be disabled.');
            console.warn('Please add PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY to .env');
            this.isConfigured = false;
            return;
        }
        
        console.log('🔧 Initializing PayOS with credentials:');
        console.log('   Client ID:', clientId.substring(0, 8) + '...');
        console.log('   API Key:', apiKey.substring(0, 8) + '...');
        console.log('   Checksum Key:', checksumKey.substring(0, 16) + '...');
        
        // Initialize PayOS SDK - Pass as object with named properties
        try {
            this.payOS = new PayOS({
                clientId: clientId,
                apiKey: apiKey,
                checksumKey: checksumKey
            });
            this.isConfigured = true;
            console.log('✅ PayOS initialized successfully');
        } catch (error) {
            console.error('❌ PayOS initialization error:', error);
            this.isConfigured = false;
        }
        
        this.config = payosConfig;
    }

    /**
     * Generate unique order code
     * Format: CMPTRAVEL_{userId}_{timestamp}
     */
    generateOrderCode(userId) {
        const timestamp = Date.now();
        // PayOS requires order code as number, max 9 digits
        return Number(timestamp.toString().slice(-9));
    }

    /**
     * Parse userId from description
     * Description format: CMP{last8ofUserId}
     * Returns userId suffix or null
     */
    parseUserIdFromDescription(description) {
        if (!description) return null;
        
        // Extract last 8 chars of userId from description like "CMP6e8f1234"
        const match = description.match(/CMP([a-f0-9]{8})/i);
        return match ? match[1] : null;
    }

    /**
     * Tạo payment link với QR code (using PayOS SDK)
     */
    async createPaymentLink(userId, amount, description = null) {
        try {
            // Check if PayOS is configured
            if (!this.isConfigured) {
                throw new Error('PayOS is not configured. Please check API credentials in .env file.');
            }
            
            // Validate amount
            const validation = this.validateAmount(amount);
            if (!validation.valid) {
                throw new Error(validation.message);
            }

            // Generate unique order code
            const orderCode = this.generateOrderCode(userId);
            
            // Payment data for PayOS SDK
            const paymentData = {
                orderCode: orderCode,
                amount: amount, // VND
                description: description || `CMP${userId.slice(-8)}`,
                returnUrl: this.config.returnUrl,
                cancelUrl: this.config.cancelUrl,
                items: [
                    {
                        name: 'Nap tien vi CMP Travel',
                        quantity: 1,
                        price: amount
                    }
                ]
            };

            console.log('📝 Creating PayOS payment with data:', JSON.stringify(paymentData, null, 2));

            // Create payment link via PayOS SDK
            const paymentLinkResponse = await this.payOS.paymentRequests.create(paymentData);

            console.log('✅ PayOS payment created:', paymentLinkResponse);

            return {
                success: true,
                data: {
                    checkoutUrl: paymentLinkResponse.checkoutUrl,
                    qrCode: paymentLinkResponse.qrCode,
                    orderCode: orderCode,
                    amount: amount,
                    amountWallet: this.convertToWalletCurrency(amount),
                    description: paymentData.description,
                    createdAt: new Date(),
                    paymentLinkId: paymentLinkResponse.paymentLinkId
                }
            };

        } catch (error) {
            console.error('❌ PayOS create payment error:', error);
            console.error('   Error name:', error.name);
            console.error('   Error message:', error.message);
            console.error('   Error stack:', error.stack);
            throw new Error(error.message || 'Failed to create payment link');
        }
    }

    /**
     * Check trạng thái thanh toán (using PayOS SDK)
     */
    async getPaymentInfo(orderCode) {
        try {
            const paymentInfo = await this.payOS.paymentRequests.get(orderCode);
            
            if (paymentInfo) {
                const payment = paymentInfo;
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
                message: 'Payment not found'
            };

        } catch (error) {
            console.error('❌ PayOS get payment error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Cancel payment link (using PayOS SDK)
     */
    async cancelPaymentLink(orderCode, reason = 'User cancelled') {
        try {
            await this.payOS.paymentRequests.cancel(orderCode, reason);
            return {
                success: true,
                message: 'Payment cancelled successfully'
            };
        } catch (error) {
            console.error('❌ PayOS cancel payment error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verify webhook signature from PayOS (using SDK)
     */
    async verifyWebhookSignature(webhookData) {
        try {
            const result = await this.payOS.webhooks.verify(webhookData);
            return result;
        } catch (error) {
            console.error('❌ Webhook signature verification failed:', error);
            return null;
        }
    }

    /**
     * Convert VND to wallet currency (USD)
     */
    convertToWalletCurrency(amountVND) {
        return amountVND * this.config.transactionSettings.exchangeRate;
    }

    /**
     * Validate payment amount
     */
    validateAmount(amount) {
        const { minAmount, maxAmount } = this.config.transactionSettings;
        
        if (amount < minAmount) {
            return {
                valid: false,
                message: `Minimum amount is ${minAmount.toLocaleString()} VND`
            };
        }
        
        if (amount > maxAmount) {
            return {
                valid: false,
                message: `Maximum amount is ${maxAmount.toLocaleString()} VND`
            };
        }
        
        return { valid: true };
    }

    /**
     * Sort object keys alphabetically
     */
    sortObject(obj) {
        
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
