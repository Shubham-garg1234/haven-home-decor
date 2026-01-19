import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/categories
 * Get all categories (public)
 */
router.get('/', async (req, res) => {
  try {
    const { active } = req.query;

    let query = supabaseAdmin
      .from('categories')
      .select('*')
      .order('name');

    if (active !== 'false') {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ categories: data || [] });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * GET /api/categories/:id
 * Get single category by ID or slug
 */
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;

    // Try slug first
    let query = supabaseAdmin
      .from('categories')
      .select('*')
      .eq('slug', identifier)
      .maybeSingle();

    let { data, error } = await query;

    // If not found, try ID
    if (!data && !error) {
      query = supabaseAdmin
        .from('categories')
        .select('*')
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
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ category: data });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

/**
 * POST /api/categories
 * Create new category (admin only)
 */
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const categoryData = req.body;

    // Generate slug if not provided
    if (!categoryData.slug && categoryData.name) {
      categoryData.slug = categoryData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    }

    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert([categoryData])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ category: data });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

/**
 * PUT /api/categories/:id
 * Update category (admin only)
 */
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const categoryData = req.body;

    // Generate slug if name changed
    if (categoryData.name && !categoryData.slug) {
      categoryData.slug = categoryData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    }

    const { data, error } = await supabaseAdmin
      .from('categories')
      .update(categoryData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ category: data });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

/**
 * DELETE /api/categories/:id
 * Delete category (admin only)
 */
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;


