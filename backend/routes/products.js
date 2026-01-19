import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/products
 * Get all products (public)
 */
router.get('/', async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, featured, limit = 50, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('products')
      .select('*, category:categories(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (category) {
      query = query.eq('category_id', category);
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    if (minPrice) {
      query = query.gte('price', parseFloat(minPrice));
    }

    if (maxPrice) {
      query = query.lte('price', parseFloat(maxPrice));
    }

    if (featured === 'true') {
      query = query.eq('is_featured', true);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ products: data || [] });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * GET /api/products/:id
 * Get single product by ID or slug
 */
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;

    // Try to find by slug first, then by ID
    let query = supabaseAdmin
      .from('products')
      .select('*, category:categories(*)')
      .eq('slug', identifier)
      .eq('is_active', true)
      .maybeSingle();

    let { data, error } = await query;

    // If not found by slug, try ID
    if (!data && !error) {
      query = supabaseAdmin
        .from('products')
        .select('*, category:categories(*)')
        .eq('id', identifier)
        .eq('is_active', true)
        .maybeSingle();

      const result = await query;
      data = result.data;
      error = result.error;
    }

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get product variants
    const { data: variants } = await supabaseAdmin
      .from('product_variants')
      .select('*')
      .eq('product_id', data.id)
      .eq('is_active', true);

    // Get related products
    const { data: relatedProducts } = await supabaseAdmin
      .from('products')
      .select('*, category:categories(*)')
      .eq('category_id', data.category_id)
      .neq('id', data.id)
      .eq('is_active', true)
      .limit(4);

    res.json({ 
      product: data,
      variants: variants || [],
      relatedProducts: relatedProducts || [],
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

/**
 * POST /api/products
 * Create new product (admin only)
 */
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const productData = req.body;

    // Generate slug if not provided
    if (!productData.slug && productData.name) {
      productData.slug = productData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert([productData])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ product: data });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

/**
 * PUT /api/products/:id
 * Update product (admin only)
 */
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const productData = req.body;

    // Generate slug if name changed
    if (productData.name && !productData.slug) {
      productData.slug = productData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .update(productData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product: data });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

/**
 * DELETE /api/products/:id
 * Delete product (admin only)
 */
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;


