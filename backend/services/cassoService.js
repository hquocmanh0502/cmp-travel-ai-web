/**
 * CASSO BANKING SERVICE
 * =====================
 * Service for integrating with Casso.vn banking API
 * - Generate QR codes with dynamic amount
 * - Check transactions
 * - Webhook handling
 * 
 * Setup Instructions:
 * 1. Register at https://casso.vn
 * 2. Link your bank account (VCB, TCB, MB, etc.)
 * 3. Get API key from Settings
 * 4. Add webhook URL: https://your-domain.com/api/wallet/webhook/casso
 * 5. Copy API credentials to .env file
 */

const axios = require('axios');
const crypto = require('crypto');
const cassoConfig = require('../config/casso');

class CassoService {
    constructor() {
        this.apiKey = cassoConfig.apiKey;
        this.baseURL = cassoConfig.apiUrl;
        this.bankAccount = cassoConfig.bankAccount;
    }

    /**
     * Generate transaction reference
     * Format: CMPTRAVEL{userId}_{timestamp}
     */
    generateTransactionRef(userId) {
        const timestamp = Date.now();
        return `${cassoConfig.descriptionPrefix}${userId}_${timestamp}`;
    }

    /**
     * Parse transaction reference to get userId
     */
    parseTransactionRef(description) {
        try {
            const regex = new RegExp(`${cassoConfig.descriptionPrefix}([a-zA-Z0-9]+)_([0-9]+)`);
            const match = description.match(regex);
            
            if (match) {
                return {
                    userId: match[1],
                    timestamp: parseInt(match[2]),
                    valid: true
                };
            }
            
            return { valid: false };
        } catch (error) {
            return { valid: false };
        }
    }

    /**
     * Generate QR code URL for bank transfer
     * Using VietQR standard
     */
    generateQRCode(amount, transactionRef) {
        const { accountNumber, accountName, bankName } = this.bankAccount;
        
        // Get bank code
        const bankCode = this.getBankCode(bankName);
        
        // Generate QR using VietQR API
        const qrParams = new URLSearchParams({
            accountName: accountName,
            amount: amount,
            addInfo: transactionRef,
        });

        // Use img.vietqr.io for QR generation
        const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-${cassoConfig.qrCodeTemplate}.png?${qrParams}`;
        
        return {
            qrUrl,
            bankInfo: this.bankAccount,
            transactionRef,
            amount,
            bankCode
        };
    }

    /**
     * Get bank code for VietQR
     */
    getBankCode(bankName) {
        const bankCodes = {
            'Vietcombank': '970436',
            'VCB': '970436',
            'Techcombank': '970407',
            'TCB': '970407',
            'MBBank': '970422',
            'MB': '970422',
            'VietinBank': '970415',
            'CTG': '970415',
            'BIDV': '970418',
            'ACB': '970416',
            'Agribank': '970405',
            'Sacombank': '970403',
            'VPBank': '970432',
            'TPBank': '970423',
        };
        
        return bankCodes[bankName] || '970436'; // Default to VCB
    }

    /**
     * Get transactions from Casso API
     * Used for polling/verification
     */
    async getTransactions(fromDate = null, toDate = null) {
        try {
            const params = {
                sort: 'DESC',
                pageSize: 50
            };

            if (fromDate) {
                params.fromDate = fromDate;
            }
            if (toDate) {
                params.toDate = toDate;
            }

            const response = await axios.get(`${this.baseURL}/transactions`, {
                headers: {
                    'Authorization': `Apikey ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                params
            });

            if (response.data && response.data.data) {
                return {
                    success: true,
                    transactions: response.data.data.records || []
                };
            }

            return {
                success: false,
                transactions: []
            };

        } catch (error) {
            console.error('❌ Casso API Error:', error.message);
            return {
                success: false,
                error: error.message,
                transactions: []
            };
        }
    }

    /**
     * Verify transaction by reference
     */
    async verifyTransaction(transactionRef, expectedAmount) {
        try {
            // Get recent transactions
            const result = await this.getTransactions();
            
            if (!result.success) {
                return {
                    verified: false,
                    error: 'Failed to fetch transactions'
                };
            }

            // Find matching transaction
            const transaction = result.transactions.find(t => 
                t.description && 
                t.description.includes(transactionRef) &&
                parseInt(t.amount) === parseInt(expectedAmount)
            );

            if (transaction) {
                return {
                    verified: true,
                    transaction: {
                        id: transaction.id,
                        amount: transaction.amount,
                        description: transaction.description,
                        when: transaction.when,
                        tid: transaction.tid
                    }
                };
            }

            return {
                verified: false,
                error: 'Transaction not found'
            };

        } catch (error) {
            console.error('❌ Verify Transaction Error:', error.message);
            return {
                verified: false,
                error: error.message
            };
        }
    }

    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload, signature) {
        try {
            const computedSignature = crypto
                .createHmac('sha256', cassoConfig.webhookSecret)
                .update(JSON.stringify(payload))
                .digest('hex');

            return computedSignature === signature;
        } catch (error) {
            console.error('❌ Signature Verification Error:', error.message);
            return false;
        }
    }

    /**
     * Convert VND to USD (wallet currency)
     */
    convertToWalletCurrency(amountVND) {
        return amountVND * cassoConfig.exchangeRate;
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
