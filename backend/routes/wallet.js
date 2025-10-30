const express = require('express');
const router = express.Router();
const User = require('../models/User');
// Payment services removed - using PayOS instead

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
    
    // Payment service removed - return error
    return res.status(501).json({
      success: false,
      error: 'Payment service not configured. Please use PayOS integration.'
    });
    
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
// MOMO IPN CALLBACK (Deprecated - use PayOS webhook)
// =============================================
router.post('/momo-ipn', async (req, res) => {
  try {
    console.log('MoMo IPN endpoint called - service deprecated');
    
    return res.status(501).json({
      success: false,
      message: 'MoMo service deprecated. Use PayOS webhook.'
    });
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
    
    const Booking = require('../models/Booking');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Get wallet transactions
    let walletTransactions = (user.wallet?.transactions || []).map(t => ({
      _id: t._id,
      type: t.type,
      amount: t.amount,
      description: t.description,
      reference: t.reference,
      status: t.status,
      createdAt: t.createdAt || t.timestamp,
      source: 'wallet'
    }));
    
    // Get paid bookings as transactions
    const paidBookings = await Booking.find({ 
      userId: userId,
      paymentStatus: 'paid'
    })
    .populate('tourId', 'name')
    .select('tourId tourName totalAmount paymentDetails bookingDate createdAt vipDiscount')
    .sort({ createdAt: -1 });
    
    const bookingTransactions = paidBookings.map(booking => ({
      _id: booking._id,
      type: 'payment',
      amount: booking.totalAmount,
      description: `Booking: ${booking.tourName || booking.tourId?.name || 'Tour'}`,
      reference: booking._id.toString(),
      status: 'completed',
      createdAt: booking.paymentDetails?.paidAt || booking.bookingDate || booking.createdAt,
      source: 'booking',
      bookingDetails: {
        tourName: booking.tourName || booking.tourId?.name,
        vipDiscount: booking.vipDiscount
      }
    }));
    
    // Combine all transactions
    let allTransactions = [...walletTransactions, ...bookingTransactions];
    
    // Filter by type if specified
    if (type) {
      allTransactions = allTransactions.filter(t => t.type === type);
    }
    
    // Sort by date (newest first) and limit
    allTransactions = allTransactions
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, parseInt(limit));
    
    res.json({
      success: true,
      transactions: allTransactions,
      total: allTransactions.length,
      breakdown: {
        wallet: walletTransactions.length,
        bookings: bookingTransactions.length
      }
    });
    
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching transaction history'
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
// CHECK BANK TRANSFER STATUS (Auto-verify with MB Bank API)
// =============================================
router.post('/:userId/check-transfer', async (req, res) => {
  try {
    const { userId } = req.params;
    const { orderId, amount } = req.body;
    
    console.log(`🔍 Checking transfer for user ${userId}, order ${orderId}, amount ${amount}`);
    
    // Generate expected content
    const userIdPrefix = userId.substring(0, 6);
    const expectedContent = `CMPTOPUP ${userIdPrefix} ${orderId}`;
    
    // MB Bank service not available - return pending status
    console.log(`⏳ Manual verification needed for order ${orderId}`);
    
    res.json({
      success: true,
      verified: false,
      message: 'Chưa nhận được giao dịch. Vui lòng liên hệ admin để xác nhận thủ công.',
      orderId,
      amount,
      status: 'pending'
    });
    
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

// =============================================
// PAYOS PAYMENT GATEWAY - CREATE PAYMENT LINK
// =============================================
const payosService = require('../services/payosService');

router.post('/:userId/topup/payos', async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body;
    
    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    console.log(`💰 Creating PayOS payment link for user ${userId}: ${amount} VND`);
    
    // Create payment link via PayOS
    const paymentResult = await payosService.createPaymentLink(userId, amount);
    
    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        error: paymentResult.error || 'Failed to create payment link'
      });
    }
    
    // Save pending transaction to user wallet
    const transaction = {
      type: 'topup',
      amount: paymentResult.data.amountWallet,
      amountVND: amount,
      status: 'pending',
      orderCode: paymentResult.data.orderCode,
      paymentLinkId: paymentResult.data.paymentLinkId,
      description: 'Wallet Top-up via Bank Transfer',
      payosDescription: paymentResult.data.description, // Keep PayOS description for reference
      date: new Date()
    };
    
    user.wallet.transactions.push(transaction);
    await user.save();
    
    console.log(`✅ Payment link created: ${paymentResult.data.checkoutUrl}`);
    
    res.json({
      success: true,
      data: {
        checkoutUrl: paymentResult.data.checkoutUrl,
        qrCode: paymentResult.data.qrCode,
        orderCode: paymentResult.data.orderCode,
        amount: amount,
        amountWallet: paymentResult.data.amountWallet,
        description: paymentResult.data.description,
        instructions: [
          '1. Scan QR code with your banking app',
          '2. Confirm the payment',
          '3. Wait for confirmation (usually within 30 seconds)',
          '4. Your wallet will be automatically updated'
        ]
      }
    });
    
  } catch (error) {
    console.error('❌ PayOS topup error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create payment link'
    });
  }
});

// =============================================
// CASSO BANK TRANSFER - GENERATE QR CODE (LEGACY)
// =============================================
const cassoService = require('../services/cassoService');
const cassoConfig = require('../config/casso');

router.post('/:userId/topup/casso', async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body;
    
    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }
    
    if (amount < cassoConfig.minAmount) {
      return res.status(400).json({
        success: false,
        error: `Minimum amount is ${cassoConfig.minAmount.toLocaleString()} VND`
      });
    }
    
    if (amount > cassoConfig.maxAmount) {
      return res.status(400).json({
        success: false,
        error: `Maximum amount is ${cassoConfig.maxAmount.toLocaleString()} VND`
      });
    }
    
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
    }
    
    // Generate transaction reference
    const transactionRef = cassoService.generateTransactionRef(userId);
    
    // Generate QR code
    const qrData = cassoService.generateQRCode(amount, transactionRef);
    
    // Save pending transaction
    user.wallet.transactions.push({
      type: 'deposit',
      amount: cassoService.convertToWalletCurrency(amount),
      balanceBefore: user.wallet.balance,
      balanceAfter: user.wallet.balance, // Will be updated when confirmed
      description: `Bank Transfer Top-up`,
      reference: transactionRef,
      status: 'pending',
      createdAt: new Date(),
      metadata: {
        amountVND: amount,
        bankTransfer: true,
        qrGenerated: true
      }
    });
    
    await user.save();
    
    res.json({
      success: true,
      message: 'QR Code generated. Please scan and transfer to complete top-up.',
      data: {
        transactionRef,
        qrCodeUrl: qrData.qrUrl,
        bankInfo: {
          bankName: qrData.bankInfo.bankName,
          accountNumber: qrData.bankInfo.accountNumber,
          accountName: qrData.bankInfo.accountName,
          branch: qrData.bankInfo.branch
        },
        amount: amount,
        amountWallet: cassoService.convertToWalletCurrency(amount),
        currency: 'VND',
        walletCurrency: 'USD',
        transferContent: transactionRef,
        instructions: [
          '1. Open your banking app',
          '2. Scan the QR code or enter bank details manually',
          '3. Transfer exact amount with the provided content',
          '4. Your wallet will be updated automatically within 1-2 minutes'
        ]
      }
    });
    
  } catch (error) {
    console.error('❌ Casso top-up error:', error);
    res.status(500).json({
      success: false,
      error: 'Error generating QR code',
      message: error.message
    });
  }
});

// =============================================
// PAYOS WEBHOOK - Auto receive payment notification
// =============================================
router.post('/webhook/payos', async (req, res) => {
  try {
    const webhookData = req.body;
    
    console.log('🔔 PayOS Webhook received:', JSON.stringify(webhookData, null, 2));
    
    // PayOS webhook structure
    const paymentData = webhookData.data || webhookData;
    const { orderCode, amount, description, transactionDateTime, reference, code } = paymentData;
    
    // Check payment status
    if (code !== '00') {
      console.log('⚠️ Payment not successful, code:', code);
      return res.json({ success: true, message: 'Payment not successful' });
    }
    
    console.log(`💰 Payment successful: Order ${orderCode}, Amount: ${amount} VND`);
    
    // Find user with this pending transaction by orderCode
    const user = await User.findOne({
      'wallet.transactions': {
        $elemMatch: {
          orderCode: Number(orderCode),
          status: 'pending'
        }
      }
    });
    
    if (!user) {
      console.error('❌ No pending transaction found for order:', orderCode);
      return res.json({ success: true, message: 'Transaction already processed or not found' });
    }
    
    // Find the transaction
    const transaction = user.wallet.transactions.find(
      t => Number(t.orderCode) === Number(orderCode) && t.status === 'pending'
    );
    
    if (!transaction) {
      console.error('❌ Transaction not found or already completed');
      return res.json({ success: true, message: 'Transaction already completed' });
    }
    
    // Update wallet balance
    const walletAmount = payosService.convertToWalletCurrency(amount);
    user.wallet.balance += walletAmount;
    
    // Update transaction status
    transaction.status = 'completed';
    transaction.completedAt = transactionDateTime ? new Date(transactionDateTime) : new Date();
    transaction.reference = reference || orderCode;
    
    await user.save();
    
    console.log(`✅ Wallet updated for user ${user._id}: +$${walletAmount} (${amount} VND)`);
    console.log(`💵 New balance: $${user.wallet.balance}`);
    
    res.json({
      success: true,
      message: 'Payment processed successfully'
    });
    
  } catch (error) {
    console.error('❌ PayOS webhook error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =============================================
// CASSO WEBHOOK - Auto receive bank transfer (LEGACY)
// =============================================
router.post('/webhook/casso', async (req, res) => {
  try {
    const webhookData = req.body;
    
    console.log('🔔 Casso Webhook received:', JSON.stringify(webhookData, null, 2));
    
    // Verify webhook signature (if using secure webhook)
    const signature = req.headers['x-casso-signature'];
    if (signature && !cassoService.verifyWebhookSignature(webhookData, signature)) {
      console.error('❌ Invalid webhook signature');
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }
    
    // Parse webhook data
    const { data } = webhookData;
    
    if (!data || data.length === 0) {
      return res.json({ success: true, message: 'No transactions to process' });
    }
    
    // Process each transaction
    for (const transaction of data) {
      const { amount, description, tid, when } = transaction;
      
      // Parse transaction reference from description
      const refData = cassoService.parseTransactionRef(description);
      
      if (!refData.valid) {
        console.log(`⚠️  Invalid transaction reference: ${description}`);
        continue;
      }
      
      const { userId } = refData;
      
      // Find user
      const user = await User.findById(userId);
      if (!user) {
        console.error(`❌ User not found: ${userId}`);
        continue;
      }
      
      // Check if transaction already processed
      const existingTransaction = user.wallet.transactions.find(
        t => t.reference === description || t.metadata?.tid === tid
      );
      
      if (existingTransaction && existingTransaction.status === 'completed') {
        console.log(`⚠️  Transaction already processed: ${tid}`);
        continue;
      }
      
      // Convert amount to wallet currency
      const walletAmount = cassoService.convertToWalletCurrency(amount);
      
      // Update pending transaction or create new one
      if (existingTransaction) {
        existingTransaction.status = 'completed';
        existingTransaction.completedAt = new Date(when);
        existingTransaction.balanceAfter = user.wallet.balance + walletAmount;
        existingTransaction.metadata = {
          ...existingTransaction.metadata,
          tid,
          bankTransactionDate: when
        };
      } else {
        user.wallet.transactions.push({
          type: 'deposit',
          amount: walletAmount,
          balanceBefore: user.wallet.balance,
          balanceAfter: user.wallet.balance + walletAmount,
          description: `Bank Transfer Top-up`,
          reference: description,
          status: 'completed',
          createdAt: new Date(when),
          completedAt: new Date(when),
          metadata: {
            amountVND: amount,
            tid,
            bankTransfer: true,
            bankTransactionDate: when
          }
        });
      }
      
      // Update wallet balance
      user.wallet.balance += walletAmount;
      
      await user.save();
      
      console.log(`✅ Wallet updated for user ${userId}: +$${walletAmount} (${amount} VND)`);
    }
    
    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });
    
  } catch (error) {
    console.error('❌ Casso webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed',
      message: error.message
    });
  }
});

// =============================================
// CHECK PAYOS PAYMENT STATUS (Polling endpoint)
// =============================================
router.get('/:userId/topup/check-payos/:orderCode', async (req, res) => {
  try {
    const { userId, orderCode } = req.params;
    
    console.log(`🔍 Checking PayOS payment status: ${orderCode}`);
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Find transaction
    const transaction = user.wallet.transactions.find(
      t => t.orderCode == orderCode
    );
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    
    // If already completed, return success
    if (transaction.status === 'completed') {
      return res.json({
        success: true,
        status: 'completed',
        message: 'Payment successful!',
        data: {
          amount: transaction.amountVND || transaction.amount,
          balance: user.wallet.balance,
          completedAt: transaction.completedAt
        }
      });
    }
    
    // Check with PayOS API if still pending
    if (transaction.status === 'pending') {
      const paymentInfo = await payosService.getPaymentInfo(orderCode);
      
      if (paymentInfo.success && paymentInfo.status === 'PAID') {
        // Update wallet
        user.wallet.balance += transaction.amount;
        transaction.status = 'completed';
        transaction.completedAt = new Date();
        transaction.reference = paymentInfo.reference;
        
        await user.save();
        
        console.log(`✅ Payment confirmed via polling: +$${transaction.amount}`);
        
        return res.json({
          success: true,
          status: 'completed',
          message: 'Payment successful!',
          data: {
            amount: transaction.amountVND || transaction.amount,
            balance: user.wallet.balance,
            completedAt: transaction.completedAt
          }
        });
      }
      
      // Still pending
      return res.json({
        success: true,
        status: 'pending',
        message: 'Payment is being processed'
      });
    }
    
    // Failed or cancelled
    res.json({
      success: false,
      status: transaction.status,
      message: 'Payment failed or cancelled'
    });
    
  } catch (error) {
    console.error('❌ Check PayOS status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =============================================
// CHECK TRANSFER STATUS (Casso - Polling endpoint - LEGACY)
// =============================================
router.get('/:userId/topup/check/:transactionRef', async (req, res) => {
  try {
    const { userId, transactionRef } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Find transaction in user's wallet
    const transaction = user.wallet.transactions.find(
      t => t.reference === transactionRef
    );
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    
    // If already completed, return success
    if (transaction.status === 'completed') {
      return res.json({
        success: true,
        status: 'completed',
        message: 'Top-up successful!',
        data: {
          amount: transaction.amount,
          balance: user.wallet.balance,
          completedAt: transaction.completedAt
        }
      });
    }
    
    // If still pending, check with Casso API
    const verification = await cassoService.verifyTransaction(
      transactionRef,
      transaction.metadata?.amountVND || transaction.amount
    );
    
    if (verification.verified) {
      // Update transaction
      transaction.status = 'completed';
      transaction.completedAt = new Date();
      transaction.balanceAfter = user.wallet.balance + transaction.amount;
      user.wallet.balance += transaction.amount;
      
      await user.save();
      
      return res.json({
        success: true,
        status: 'completed',
        message: 'Top-up successful!',
        data: {
          amount: transaction.amount,
          balance: user.wallet.balance,
          completedAt: transaction.completedAt
        }
      });
    }
    
    // Still pending
    res.json({
      success: true,
      status: 'pending',
      message: 'Transfer not received yet. Please complete the bank transfer.',
      data: {
        transactionRef,
        amount: transaction.amount,
        createdAt: transaction.createdAt
      }
    });
    
  } catch (error) {
    console.error('❌ Check transfer error:', error);
    res.status(500).json({
      success: false,
      error: 'Error checking transfer status',
      message: error.message
    });
  }
});

module.exports = router;