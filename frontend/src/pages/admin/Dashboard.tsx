import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, FolderTree, ShoppingCart, TrendingUp } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

const Dashboard = () => {
  const { session } = useAuth();

  const { data: statsData } = useQuery({
    queryKey: ['admin-stats'],
    enabled: !!session?.access_token,
    queryFn: async () => {
      const response = await api.getAdminStats(session!.access_token);
      return response.stats;
    },
  });

  const { data: ordersData } = useQuery({
    queryKey: ['admin-orders'],
    enabled: !!session?.access_token,
    queryFn: async () => {
      const response = await api.getOrders(session!.access_token);
      return response.orders;
    },
  });

  const recentOrders = ordersData?.slice(0, 5) || [];

  const statCards = [
    { title: 'Total Products', value: statsData?.products || 0, icon: Package, color: 'text-blue-500' },
    { title: 'Categories', value: statsData?.categories || 0, icon: FolderTree, color: 'text-green-500' },
    { title: 'Total Orders', value: statsData?.orders || 0, icon: ShoppingCart, color: 'text-purple-500' },
    { title: 'Total Revenue', value: formatPrice(statsData?.revenue || 0), icon: TrendingUp, color: 'text-orange-500' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome to your admin dashboard</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders && recentOrders.length > 0 ? (
              <div className="space-y-4">
                {recentOrders.map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatPrice(order.total)}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No orders yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
