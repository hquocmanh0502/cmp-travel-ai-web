/**
 * MoMo Payment Service
 * Handles payment creation, signature generation, and transaction verification
 */

const crypto = require('crypto');
const axios = require('axios');
const momoConfig = require('../config/momo');

class MoMoService {
    /**
     * Generate signature for MoMo API request
     * @param {Object} data - Request data
     * @returns {string} HMAC SHA256 signature
     */
    generateSignature(data) {
        const { secretKey } = momoConfig;
        
        // Create raw signature string (order matters!)
        const rawSignature = `accessKey=${data.accessKey}&amount=${data.amount}&extraData=${data.extraData}&ipnUrl=${data.ipnUrl}&orderId=${data.orderId}&orderInfo=${data.orderInfo}&partnerCode=${data.partnerCode}&redirectUrl=${data.redirectUrl}&requestId=${data.requestId}&requestType=${data.requestType}`;
        
        // Generate HMAC SHA256
        const signature = crypto
            .createHmac('sha256', secretKey)
            .update(rawSignature)
            .digest('hex');
        
        return signature;
    }

    /**
     * Create MoMo payment request
     * @param {string} userId - User ID
     * @param {number} amount - Amount in VND
     * @param {string} orderInfo - Order description
     * @returns {Object} MoMo payment response
     */
    async createPayment(userId, amount, orderInfo) {
        try {
            // Generate unique IDs
            const orderId = `${userId}_${Date.now()}`;
            const requestId = `${userId}_${Date.now()}`;
            
            // Prepare request data
            const requestData = {
                partnerCode: momoConfig.partnerCode,
                accessKey: momoConfig.accessKey,
                requestId: requestId,
                amount: amount.toString(),
                orderId: orderId,
                orderInfo: orderInfo,
                redirectUrl: momoConfig.redirectUrl,
                ipnUrl: momoConfig.ipnUrl,
                requestType: momoConfig.requestType,
                extraData: momoConfig.extraData,
                lang: momoConfig.lang
            };
            
            // Generate signature
            requestData.signature = this.generateSignature(requestData);
            
            console.log('MoMo Payment Request:', {
                orderId,
                requestId,
                amount,
                orderInfo
            });
            
            // Call MoMo API
            const response = await axios.post(momoConfig.endpoint, requestData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('MoMo Response:', response.data);
            
            return {
                success: response.data.resultCode === 0,
                payUrl: response.data.payUrl,
                orderId: orderId,
                requestId: requestId,
                message: response.data.message,
                resultCode: response.data.resultCode
            };
            
        } catch (error) {
            console.error('MoMo Payment Error:', error.response?.data || error.message);
            throw new Error('Không thể tạo thanh toán MoMo: ' + (error.response?.data?.message || error.message));
        }
    }

    /**
     * Verify MoMo IPN (Instant Payment Notification) callback
     * @param {Object} data - IPN callback data
     * @returns {boolean} Is signature valid?
     */
    verifyIPNSignature(data) {
        const {
            partnerCode,
            orderId,
            requestId,
            amount,
            orderInfo,
            orderType,
            transId,
            resultCode,
            message,
            payType,
            responseTime,
            extraData,
            signature
        } = data;
        
        // Create raw signature string
        const rawSignature = `accessKey=${momoConfig.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
        
        // Generate expected signature
        const expectedSignature = crypto
            .createHmac('sha256', momoConfig.secretKey)
            .update(rawSignature)
            .digest('hex');
        
        const isValid = signature === expectedSignature;
        
        console.log('IPN Signature Verification:', {
            received: signature,
            expected: expectedSignature,
            isValid
        });
        
        return isValid;
    }

    /**
     * Query MoMo transaction status
     * @param {string} orderId - Order ID
     * @param {string} requestId - Request ID
     * @returns {Object} Transaction status
     */
    async queryTransaction(orderId, requestId) {
        try {
            const queryData = {
                partnerCode: momoConfig.partnerCode,
                accessKey: momoConfig.accessKey,
                requestId: requestId,
                orderId: orderId,
                lang: momoConfig.lang
            };
            
            // Generate signature for query
            const rawSignature = `accessKey=${queryData.accessKey}&orderId=${queryData.orderId}&partnerCode=${queryData.partnerCode}&requestId=${queryData.requestId}`;
            queryData.signature = crypto
                .createHmac('sha256', momoConfig.secretKey)
                .update(rawSignature)
                .digest('hex');
            
            const response = await axios.post(momoConfig.queryEndpoint, queryData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            return response.data;
            
        } catch (error) {
            console.error('MoMo Query Error:', error.response?.data || error.message);
            throw new Error('Không thể kiểm tra trạng thái giao dịch');
        }
    }
}

module.exports = new MoMoService();
