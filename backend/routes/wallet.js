const express = require('express');
const router = express.Router();
const User = require('../models/User');
const momoService = require('../services/momoService');
const mbbankService = require('../services/mbbankService');
const payosService = require('../services/payosService');

/**
 * CMP WALLET ROUTES WITH MOMO PAYMENT INTEGRATION
 * ===============================================
 * Handles wallet top-up, payments, and transaction history
 * Integrated with MoMo Developer API for real payment processing
 */

// Middleware to verify authentication (simplified)
const verifyAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }
    
    // TODO: Implement proper JWT verification
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      error: 'Invalid authentication' 
    });
  }
};

// =============================================
// GET WALLET BALANCE
// =============================================
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Initialize wallet if not exists
    if (!user.wallet) {
      user.wallet = {
        balance: 0,
        currency: 'USD',
        transactions: []
      };
      await user.save();
    }
    
    res.json({
      success: true,
      wallet: {
        balance: user.wallet.balance || 0,
        currency: user.wallet.currency || 'USD',
        transactionCount: user.wallet.transactions?.length || 0
      }
    });
    
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching wallet'
    });
  }
});

// =============================================
// CREATE MOMO PAYMENT (TOP-UP WALLET)
// =============================================
router.post('/:userId/topup', async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Số tiền không hợp lệ'
      });
    }
    
    // Minimum 10,000 VND
    if (amount < 10000) {
      return res.status(400).json({
        success: false,
        error: 'Số tiền tối thiểu là 10,000 VND'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy người dùng'
      });
    }
    
    // Initialize wallet if not exists
    if (!user.wallet) {
      user.wallet = {
        balance: 0,
        currency: 'USD',
        transactions: []
      };
    }
    
    // Create MoMo payment
    const orderInfo = `Nạp ${amount.toLocaleString('vi-VN')} VND vào CMP Wallet`;
    const paymentResult = await momoService.createPayment(userId, amount, orderInfo);
    
    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        error: paymentResult.message || 'Không thể tạo thanh toán'
      });
    }
    
    // Save pending transaction
    user.wallet.transactions.push({
      type: 'topup',
      amount: amount, // VND amount (will convert to USD when completed)
      description: orderInfo,
      orderId: paymentResult.orderId,
      status: 'pending',
      timestamp: new Date()
    });
    
    await user.save();
    
    res.json({
      success: true,
      payUrl: paymentResult.payUrl,
      orderId: paymentResult.orderId,
      message: 'Đã tạo thanh toán MoMo thành công'
    });
    
  } catch (error) {
    console.error('Top-up error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Lỗi khi tạo thanh toán'
    });
  }
});

// =============================================
// MOMO IPN CALLBACK (Payment Notification)
// =============================================
router.post('/momo-ipn', async (req, res) => {
  try {
    console.log('MoMo IPN Received:', req.body);
    
    const {
      orderId,
      requestId,
      amount,
      orderInfo,
      transId,
      resultCode,
      message,
      responseTime,
      extraData
    } = req.body;
    
    // Verify signature
    const isValid = momoService.verifyIPNSignature(req.body);
    if (!isValid) {
      console.error('Invalid MoMo IPN signature');
      return res.status(400).json({
        success: false,
        message: 'Invalid signature'
      });
    }
    
    // Extract userId from orderId (format: userId_timestamp)
    const userId = orderId.split('_')[0];
    
    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Find pending transaction
    const transaction = user.wallet.transactions.find(
      t => t.orderId === orderId && t.status === 'pending'
    );
    
    if (!transaction) {
      console.error('Transaction not found:', orderId);
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // Update transaction based on result
    if (resultCode === 0) {
      // Payment successful
      transaction.status = 'completed';
      transaction.momoTransId = transId;
      
      // Convert VND to USD (demo rate: 1 VND = 1 USD)
      const usdAmount = amount; // For demo, 1:1 conversion
      user.wallet.balance += usdAmount;
      
      console.log(`✅ Payment successful: ${amount} VND -> ${usdAmount} USD added to wallet`);
      
    } else {
      // Payment failed
      transaction.status = 'failed';
      console.log(`❌ Payment failed: ${message}`);
    }
    
    await user.save();
    
    // Respond to MoMo
    res.json({
      success: true,
      message: 'IPN processed'
    });
    
  } catch (error) {
    console.error('MoMo IPN Error:', error);
    res.status(500).json({
      success: false,
      message: 'IPN processing error'
    });
  }
});

// =============================================
// USE WALLET FOR BOOKING PAYMENT
// =============================================
router.post('/:userId/pay', async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, bookingId, description } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Số tiền không hợp lệ'
      });
    }
    
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        error: 'Thiếu thông tin booking'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy người dùng'
      });
    }
    
    // Check wallet balance
    if (!user.wallet || user.wallet.balance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Số dư không đủ',
        balance: user.wallet?.balance || 0,
        required: amount
      });
    }
    
    // Deduct from wallet
    user.wallet.balance -= amount;
    
    // Record transaction
    user.wallet.transactions.push({
      type: 'payment',
      amount: -amount, // Negative for deduction
      description: description || `Thanh toán cho booking ${bookingId}`,
      orderId: bookingId,
      status: 'completed',
      timestamp: new Date()
    });
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Thanh toán thành công',
      remainingBalance: user.wallet.balance
    });
    
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Lỗi khi thanh toán'
    });
  }
});

// =============================================
// GET TRANSACTION HISTORY
// =============================================
router.get('/:userId/transactions', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, type } = req.query;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy người dùng'
      });
    }
    
    let transactions = user.wallet?.transactions || [];
    
    // Filter by type if specified
    if (type) {
      transactions = transactions.filter(t => t.type === type);
    }
    
    // Sort by timestamp (newest first) and limit
    transactions = transactions
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit));
    
    res.json({
      success: true,
      transactions,
      total: transactions.length
    });
    
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi khi lấy lịch sử giao dịch'
    });
  }
});

// =============================================
// CHECK IF USER CAN PAY WITH WALLET
// =============================================
router.post('/:userId/check-payment', async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body;
    
    const user = await User.findById(userId);
    
    if (!user || !user.wallet) {
      return res.json({
        success: true,
        canPay: false,
        reason: 'Chưa có ví',
        balance: 0,
        required: amount,
        shortage: amount
      });
    }
    
    const balance = user.wallet.balance || 0;
    const canPay = balance >= amount;
    
    res.json({
      success: true,
      canPay,
      balance,
      required: amount,
      shortage: canPay ? 0 : (amount - balance)
    });
    
  } catch (error) {
    console.error('Check payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi khi kiểm tra khả năng thanh toán'
    });
  }
});

// =============================================
// CREATE PAYOS PAYMENT LINK (Recommended Method)
// =============================================
router.post('/:userId/create-payos-payment', async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body;
    
    if (!amount || amount < 1000) {
      return res.status(400).json({
        success: false,
        error: 'Số tiền phải lớn hơn 1,000 VND'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Generate unique order code
    const orderCode = `CMP${Date.now()}`;
    const userIdPrefix = userId.substring(0, 6);
    const description = `CMPTOPUP ${userIdPrefix} ${orderCode}`;
    
    // Create PayOS payment link
    const result = await payosService.createPaymentLink({
      orderCode: orderCode,
      amount: amount,
      description: description,
      buyerName: user.name || 'Guest',
      buyerEmail: user.email || '',
      buyerPhone: user.phone || '',
      returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-result.html?success=true`,
      cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-result.html?success=false`
    });
    
    if (result.success) {
      res.json({
        success: true,
        checkoutUrl: result.checkoutUrl,
        qrCode: result.qrCode,
        orderCode: orderCode,
        amount: amount
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message
      });
    }
    
  } catch (error) {
    console.error('Create PayOS payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =============================================
// PAYOS WEBHOOK (Auto-verify payment)
// =============================================
router.post('/payos-webhook', async (req, res) => {
  try {
    const signature = req.headers['x-payos-signature'];
    const webhookData = req.body;
    
    // Verify webhook signature
    if (!payosService.verifyWebhookSignature(webhookData.data, signature)) {
      console.warn('⚠️ Invalid PayOS webhook signature');
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }
    
    const { orderCode, amount, description, status } = webhookData.data;
    
    if (status === 'PAID') {
      // Parse user ID from description: "CMPTOPUP {userId} {orderCode}"
      const match = description.match(/CMPTOPUP\s+([a-f0-9]+)\s+/);
      if (!match) {
        console.error('❌ Cannot parse userId from description:', description);
        return res.json({ success: true }); // Still acknowledge webhook
      }
      
      const userIdPrefix = match[1];
      
      // Find user by ID prefix
      const user = await User.findOne({ _id: { $regex: `^${userIdPrefix}` } });
      
      if (user) {
        // Initialize wallet if needed
        if (!user.wallet) {
          user.wallet = { balance: 0, currency: 'VND', transactions: [] };
        }
        
        // Check if already processed
        const existingTx = user.wallet.transactions.find(
          t => t.orderId === orderCode && t.status === 'completed'
        );
        
        if (!existingTx) {
          // Add amount
          user.wallet.balance += amount;
          
          // Record transaction
          user.wallet.transactions.push({
            type: 'topup',
            amount: amount,
            description: `Nạp tiền qua PayOS (${orderCode})`,
            orderId: orderCode,
            status: 'completed',
            timestamp: new Date()
          });
          
          await user.save();
          
          console.log(`✅ PayOS webhook: Auto-updated ${amount} VND for user ${user._id}`);
        }
      }
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('PayOS webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================
// CHECK BANK TRANSFER STATUS (Fallback method)
// =============================================
router.post('/:userId/check-transfer', async (req, res) => {
  try {
    const { userId } = req.params;
    const { orderId, amount } = req.body;
    
    console.log(`🔍 Checking transfer for user ${userId}, order ${orderId}, amount ${amount}`);
    
    // Generate expected content
    const userIdPrefix = userId.substring(0, 6);
    const expectedContent = `CMPTOPUP ${userIdPrefix} ${orderId}`;
    
    // Check with MB Bank API
    const result = await mbbankService.checkTransferByContent(
      '0344868243', // Your MB Bank account number
      expectedContent,
      amount,
      30 // Check last 30 minutes
    );
    
    if (result.found) {
      // Transaction found! Update wallet
      const user = await User.findById(userId);
      
      if (user) {
        // Initialize wallet if needed
        if (!user.wallet) {
          user.wallet = { balance: 0, currency: 'VND', transactions: [] };
        }
        
        // Check if already processed
        const existingTx = user.wallet.transactions.find(
          t => t.orderId === orderId && t.status === 'completed'
        );
        
        if (!existingTx) {
          // Add amount
          user.wallet.balance += amount;
          
          // Record transaction
          user.wallet.transactions.push({
            type: 'topup',
            amount: amount,
            description: `Nạp tiền qua chuyển khoản MB Bank (${result.transaction.transactionId})`,
            orderId: orderId,
            status: 'completed',
            timestamp: new Date(result.transaction.timestamp)
          });
          
          await user.save();
          
          console.log(`✅ Auto-verified transfer: ${amount} VND for user ${userId}`);
          
          return res.json({
            success: true,
            verified: true,
            message: 'Đã xác nhận thanh toán thành công!',
            newBalance: user.wallet.balance,
            transaction: result.transaction
          });
        }
      }
    }
    
    // Not found yet
    res.json({
      success: true,
      verified: false,
      message: 'Chưa nhận được giao dịch. Hệ thống sẽ tự động kiểm tra...',
      orderId,
      amount,
      status: 'pending'
    });
    
  } catch (error) {
    console.error('Check transfer error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi khi kiểm tra giao dịch',
      message: error.message
    });
  }
});

// =============================================
// ADMIN: CONFIRM BANK TRANSFER (Manual approval)
// =============================================
router.post('/admin/confirm-transfer', async (req, res) => {
  try {
    const { userId, orderId, amount, transactionId } = req.body;
    
    // TODO: Add admin authentication
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy người dùng'
      });
    }
    
    // Initialize wallet if not exists
    if (!user.wallet) {
      user.wallet = {
        balance: 0,
        currency: 'VND',
        transactions: []
      };
    }
    
    // Add amount to wallet
    user.wallet.balance += amount;
    
    // Record transaction
    user.wallet.transactions.push({
      type: 'topup',
      amount: amount,
      description: `Nạp tiền qua chuyển khoản ngân hàng (${transactionId})`,
      orderId: orderId,
      status: 'completed',
      timestamp: new Date()
    });
    
    await user.save();
    
    console.log(`✅ Admin confirmed transfer: ${amount} VND for user ${userId}`);
    
    res.json({
      success: true,
      message: 'Xác nhận chuyển khoản thành công',
      newBalance: user.wallet.balance
    });
    
  } catch (error) {
    console.error('Confirm transfer error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi khi xác nhận giao dịch'
    });
  }
});

// =============================================
// CASSO WEBHOOK (Auto-verify from Casso.vn)
// =============================================
router.post('/casso-webhook', async (req, res) => {
  try {
    console.log('📥 Casso webhook received:', req.body);
    
    const transactions = req.body.data || [];
    
    for (const tx of transactions) {
      const description = (tx.description || '').toUpperCase();
      const amount = parseFloat(tx.amount || 0);
      
      // Parse nội dung: "CMPTOPUP 68e286 1730123456"
      const match = description.match(/CMPTOPUP\s+([A-Z0-9]+)\s+([0-9]+)/i);
      
      if (match) {
        const userIdPrefix = match[1];
        const orderId = match[2];
        
        console.log(`🔍 Found matching transaction: userId=${userIdPrefix}, orderId=${orderId}, amount=${amount}`);
        
        // Find user by ID prefix
        const user = await User.findOne({
          _id: { $regex: new RegExp(`^${userIdPrefix}`, 'i') }
        });
        
        if (user) {
          // Check if transaction already processed
          const existingTx = user.wallet?.transactions?.find(
            t => t.orderId === orderId && t.status === 'completed'
          );
          
          if (!existingTx) {
            // Initialize wallet if needed
            if (!user.wallet) {
              user.wallet = { balance: 0, currency: 'VND', transactions: [] };
            }
            
            // Add amount
            user.wallet.balance += amount;
            
            // Record transaction
            user.wallet.transactions.push({
              type: 'topup',
              amount: amount,
              description: `Nạp tiền qua chuyển khoản (Auto: ${tx.tid})`,
              orderId: orderId,
              status: 'completed',
              timestamp: new Date(tx.when)
            });
            
            await user.save();
            
            console.log(`✅ Auto-verified transfer: ${amount} VND for user ${user._id}`);
          } else {
            console.log(`⚠️ Transaction already processed: ${orderId}`);
          }
        } else {
          console.log(`❌ User not found with prefix: ${userIdPrefix}`);
        }
      }
    }
    
    // Always return success to Casso
    res.json({ success: true });
    
  } catch (error) {
    console.error('Casso webhook error:', error);
    res.json({ success: true }); // Still return success to avoid retry
  }
});

module.exports = router;