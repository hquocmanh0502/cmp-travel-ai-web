const express = require('express');
const router = express.Router();
const CMPWallet = require('../models/CMPWallet');
const User = require('../models/User');

/**
 * CMP WALLET ROUTES
 * =================
 * Future feature endpoints for wallet management
 * 
 * NOTE: This is a placeholder for future development
 * Requires additional security, KYC verification, and payment gateway integration
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
router.get('/:userId', verifyAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    let wallet = await CMPWallet.findOne({ userId });
    
    // Create wallet if doesn't exist
    if (!wallet) {
      wallet = new CMPWallet({ userId });
      await wallet.save();
    }
    
    res.json({
      success: true,
      wallet: {
        balance: wallet.balance,
        availableBalance: wallet.availableBalance,
        currency: wallet.currency,
        status: wallet.status,
        isVerified: wallet.isVerified,
        verificationLevel: wallet.verificationLevel
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
// DEPOSIT FUNDS (Future: Integrate payment gateway)
// =============================================
router.post('/:userId/deposit', verifyAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, paymentMethod, paymentReference } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid deposit amount'
      });
    }
    
    let wallet = await CMPWallet.findOne({ userId });
    if (!wallet) {
      wallet = new CMPWallet({ userId });
    }
    
    // TODO: Integrate with payment gateway (Stripe, PayPal, etc.)
    // For now, just add the funds
    await wallet.deposit(amount, `Deposit via ${paymentMethod}`, paymentReference);
    
    res.json({
      success: true,
      message: 'Deposit successful',
      wallet: {
        balance: wallet.balance,
        transaction: wallet.transactions[wallet.transactions.length - 1]
      }
    });
    
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error processing deposit'
    });
  }
});

// =============================================
// MAKE PAYMENT FOR BOOKING
// =============================================
router.post('/:userId/pay', verifyAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, bookingId, description } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment amount'
      });
    }
    
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        error: 'Booking ID required'
      });
    }
    
    const wallet = await CMPWallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }
    
    // Make payment
    const paymentResult = await wallet.makePayment(amount, bookingId, description);
    
    res.json({
      success: true,
      message: 'Payment successful',
      payment: paymentResult
    });
    
  } catch (error) {
    console.error('Payment error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Error processing payment'
    });
  }
});

// =============================================
// REFUND TO WALLET
// =============================================
router.post('/:userId/refund', verifyAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, bookingId, reason } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid refund amount'
      });
    }
    
    let wallet = await CMPWallet.findOne({ userId });
    if (!wallet) {
      wallet = new CMPWallet({ userId });
    }
    
    await wallet.refund(amount, bookingId, reason);
    
    res.json({
      success: true,
      message: 'Refund successful',
      wallet: {
        balance: wallet.balance
      }
    });
    
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error processing refund'
    });
  }
});

// =============================================
// GET TRANSACTION HISTORY
// =============================================
router.get('/:userId/transactions', verifyAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, type } = req.query;
    
    const wallet = await CMPWallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }
    
    const transactions = wallet.getTransactionHistory(parseInt(limit), type);
    
    res.json({
      success: true,
      transactions
    });
    
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching transactions'
    });
  }
});

// =============================================
// CHECK IF USER CAN PAY WITH WALLET
// =============================================
router.post('/:userId/check-payment', verifyAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body;
    
    const wallet = await CMPWallet.findOne({ userId });
    
    if (!wallet) {
      return res.json({
        success: true,
        canPay: false,
        reason: 'Wallet not found',
        balance: 0
      });
    }
    
    const canPay = wallet.status === 'active' && wallet.availableBalance >= amount;
    
    res.json({
      success: true,
      canPay,
      balance: wallet.balance,
      availableBalance: wallet.availableBalance,
      required: amount,
      shortage: canPay ? 0 : (amount - wallet.availableBalance)
    });
    
  } catch (error) {
    console.error('Check payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Error checking payment capability'
    });
  }
});

module.exports = router;
