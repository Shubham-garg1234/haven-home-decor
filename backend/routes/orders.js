import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/orders
 * Get user's orders (or all orders if admin)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('orders')
      .select('*, items:order_items(*, product:products(*))')
      .order('created_at', { ascending: false });

    // If not admin, only show user's orders
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (roleData?.role !== 'admin') {
      query = query.eq('user_id', req.user.id);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ orders: data || [] });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/**
 * GET /api/orders/:id
 * Get single order by ID or order number
 */
router.get('/:identifier', authenticate, async (req, res) => {
  try {
    const { identifier } = req.params;

    // Try order_number first
    let query = supabaseAdmin
      .from('orders')
      .select('*, items:order_items(*, product:products(*))')
      .eq('order_number', identifier)
      .maybeSingle();

    let { data, error } = await query;

    // If not found, try ID
    if (!data && !error) {
      query = supabaseAdmin
        .from('orders')
        .select('*, items:order_items(*, product:products(*))')
        .eq('id', identifier)
        .maybeSingle();

      const result = await query;
      data = result.data;
      error = result.error;
    }

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user has access (owner or admin)
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (data.user_id !== req.user.id && roleData?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ order: data });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

/**
 * POST /api/orders
 * Create new order
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { 
      shipping_address, 
      payment_method = 'cod', 
      cart_items,
      payment_status,
      payment_details 
    } = req.body;

    if (!shipping_address) {
      return res.status(400).json({ error: 'Shipping address is required' });
    }

    // Calculate totals from cart items
    let subtotal = 0;
    const orderItems = [];

    if (cart_items && cart_items.length > 0) {
      for (const item of cart_items) {
        const { data: product } = await supabaseAdmin
          .from('products')
          .select('price')
          .eq('id', item.product_id)
          .single();

        if (!product) {
          return res.status(400).json({ error: `Product ${item.product_id} not found` });
        }

        const itemTotal = product.price * item.quantity;
        subtotal += itemTotal;

        orderItems.push({
          product_id: item.product_id,
          variant_id: item.variant_id || null,
          quantity: item.quantity,
          price: product.price,
          total: itemTotal,
        });
      }
    } else {
      // Get items from cart
      const { data: cartItems } = await supabaseAdmin
        .from('cart_items')
        .select('*, product:products(*)')
        .eq('user_id', req.user.id);

      if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
      }

      for (const item of cartItems) {
        const itemTotal = item.product.price * item.quantity;
        subtotal += itemTotal;

        orderItems.push({
          product_id: item.product_id,
          variant_id: item.variant_id || null,
          quantity: item.quantity,
          price: item.product.price,
          total: itemTotal,
        });
      }
    }

    const shippingCost = subtotal >= 2000 ? 0 : 99;
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + shippingCost + tax;

    // Determine payment status
    let finalPaymentStatus = 'pending';
    if (payment_status) {
      finalPaymentStatus = payment_status;
    } else {
      finalPaymentStatus = payment_method === 'cod' ? 'pending' : 'pending';
    }

    // Prepare order notes with payment details if provided
    const notes = payment_details ? {
      razorpay_order_id: payment_details.razorpay_order_id,
      razorpay_payment_id: payment_details.razorpay_payment_id,
      payment_verified_at: new Date().toISOString(),
    } : null;

    // Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: req.user.id,
        subtotal,
        shipping_cost: shippingCost,
        tax,
        total,
        shipping_address,
        payment_method,
        payment_status: finalPaymentStatus,
        status: 'pending',
        order_number: 'TEMP', // Will be overwritten by trigger
        notes: notes ? JSON.stringify(notes) : null,
      })
      .select()
      .single();

    if (orderError) {
      return res.status(400).json({ error: orderError.message });
    }

    // Create order items
    const orderItemsWithOrderId = orderItems.map(item => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItemsWithOrderId);

    if (itemsError) {
      // Rollback order creation
      await supabaseAdmin.from('orders').delete().eq('id', order.id);
      return res.status(400).json({ error: itemsError.message });
    }

    // Clear cart if order was created from cart
    if (!cart_items) {
      await supabaseAdmin
        .from('cart_items')
        .delete()
        .eq('user_id', req.user.id);
    }

    // Fetch complete order
    const { data: completeOrder } = await supabaseAdmin
      .from('orders')
      .select('*, items:order_items(*, product:products(*))')
      .eq('id', order.id)
      .single();

    res.status(201).json({ order: completeOrder });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

/**
 * PUT /api/orders/:id/status
 * Update order status (admin only)
 */
router.put('/:id/status', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_status } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (payment_status) updateData.payment_status = payment_status;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No update data provided' });
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order: data });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

export default router;


