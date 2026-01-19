import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All address routes require authentication
router.use(authenticate);

/**
 * GET /api/addresses
 * Get user's addresses
 */
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('addresses')
      .select('*')
      .eq('user_id', req.user.id)
      .order('is_default', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ addresses: data || [] });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});

/**
 * POST /api/addresses
 * Create new address
 */
router.post('/', async (req, res) => {
  try {
    const addressData = {
      ...req.body,
      user_id: req.user.id,
      country: req.body.country || 'India',
    };

    const { data, error } = await supabaseAdmin
      .from('addresses')
      .insert([addressData])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ address: data });
  } catch (error) {
    console.error('Create address error:', error);
    res.status(500).json({ error: 'Failed to create address' });
  }
});

/**
 * PUT /api/addresses/:id
 * Update address
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify address belongs to user
    const { data: address } = await supabaseAdmin
      .from('addresses')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    const { data, error } = await supabaseAdmin
      .from('addresses')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ address: data });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ error: 'Failed to update address' });
  }
});

/**
 * DELETE /api/addresses/:id
 * Delete address
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify address belongs to user
    const { data: address } = await supabaseAdmin
      .from('addresses')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    const { error } = await supabaseAdmin
      .from('addresses')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

export default router;

