import express from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';
import { razorpay } from '../config/razorpay.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/payments/create-order
 * Create Razorpay order
 */
router.post('/create-order', authenticate, async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({ error: 'Payment gateway not configured' });
    }

    const { amount, currency = 'INR', notes = {} } = req.body;

    if (!amount || amount < 1) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt: `receipt_${Date.now()}`,
      notes: {
        user_id: req.user.id,
        ...notes,
      },
    };

    const order = await razorpay.orders.create(options);

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    });
  } catch (error) {
    console.error('Create payment order error:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

/**
 * POST /api/payments/verify
 * Verify Razorpay payment
 */
router.post('/verify', authenticate, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification data is required' });
    }

    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(text)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    res.json({
      verified: true,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

/**
 * POST /api/payments/webhook
 * Razorpay webhook handler
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    if (!webhookSecret || !signature) {
      return res.status(400).json({ error: 'Webhook secret or signature missing' });
    }

    // Verify webhook signature
    const text = req.body.toString();
    const generatedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(text)
      .digest('hex');

    if (generatedSignature !== signature) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = JSON.parse(text);
    const { event: eventType, payload } = event;

    // Handle different payment events
    switch (eventType) {
      case 'payment.captured':
        // Update order payment status
        const payment = payload.payment.entity;
        const orderId = payment.order_id;

        // Find order by Razorpay order ID in notes
        const { data: orders } = await supabaseAdmin
          .from('orders')
          .select('*')
          .contains('notes', { razorpay_order_id: orderId });

        if (orders && orders.length > 0) {
          await supabaseAdmin
            .from('orders')
            .update({
              payment_status: 'paid',
              notes: JSON.stringify({
                ...(typeof orders[0].notes === 'string' 
                  ? JSON.parse(orders[0].notes) 
                  : orders[0].notes || {}),
                razorpay_payment_id: payment.id,
                payment_captured_at: new Date().toISOString(),
              }),
            })
            .eq('id', orders[0].id);
        }
        break;

      case 'payment.failed':
        // Handle failed payment
        console.log('Payment failed:', payload.payment.entity);
        break;

      default:
        console.log('Unhandled webhook event:', eventType);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;


