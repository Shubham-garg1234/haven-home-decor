import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require admin authentication
router.use(authenticate);
router.use(isAdmin);

/**
 * GET /api/admin/stats
 * Get dashboard statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const [productsRes, categoriesRes, ordersRes, usersRes] = await Promise.all([
      supabaseAdmin.from('products').select('id', { count: 'exact' }),
      supabaseAdmin.from('categories').select('id', { count: 'exact' }),
      supabaseAdmin.from('orders').select('id, total, status'),
      supabaseAdmin.from('profiles').select('id', { count: 'exact' }),
    ]);

    const totalRevenue = ordersRes.data?.reduce((sum, order) => sum + Number(order.total), 0) || 0;
    const pendingOrders = ordersRes.data?.filter(o => o.status === 'pending').length || 0;

    res.json({
      stats: {
        products: productsRes.count || 0,
        categories: categoriesRes.count || 0,
        orders: ordersRes.data?.length || 0,
        users: usersRes.count || 0,
        revenue: totalRevenue,
        pendingOrders,
      },
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * GET /api/admin/users
 * Get all users
 */
router.get('/users', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({
      page: Math.floor(offset / limit) + 1,
      perPage: parseInt(limit),
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Get roles for each user
    const userIds = users.users.map(u => u.id);
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', userIds);

    const usersWithRoles = users.users.map(user => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      role: roles?.find(r => r.user_id === user.id)?.role || 'customer',
    }));

    res.json({ users: usersWithRoles });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * PUT /api/admin/users/:id/role
 * Update user role
 */
router.put('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['admin', 'customer'].includes(role)) {
      return res.status(400).json({ error: 'Valid role (admin/customer) is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: id,
        role,
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ user_role: data });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

export default router;


