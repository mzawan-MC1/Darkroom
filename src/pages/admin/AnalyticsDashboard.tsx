import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/currencyUtils';
import { TrendingUp, DollarSign, Users, Calendar, Star, ShoppingCart } from 'lucide-react';

interface Stats {
  totalRevenue: number;
  totalBookings: number;
  totalCustomers: number;
  averageRating: number;
  merchandiseSold: number;
  pendingBookings: number;
}

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    totalBookings: 0,
    totalCustomers: 0,
    averageRating: 0,
    merchandiseSold: 0,
    pendingBookings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    fetchAnalytics(signal);
    return () => controller.abort();
  }, [timeRange]);

  const fetchAnalytics = async (signal?: AbortSignal) => {
    try {
      const now = new Date();
      let startDate = new Date();

      switch (timeRange) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      const [
        bookingsResult,
        transactionsResult,
        customersResult,
        reviewsResult,
      ] = await Promise.all([
        supabase
          .from('bookings')
          .select('total_price, status')
          .gte('created_at', startDate.toISOString())
          .abortSignal(signal as AbortSignal),
        supabase
          .from('pos_transactions')
          .select('total, transaction_type')
          .gte('created_at', startDate.toISOString())
          .abortSignal(signal as AbortSignal),
        supabase
          .from('profiles')
          .select('id', { count: 'exact' })
          .abortSignal(signal as AbortSignal),
        supabase
          .from('reviews')
          .select('rating')
          .eq('is_approved', true)
          .abortSignal(signal as AbortSignal),
      ]);

      if (signal?.aborted) return;

      const bookings = (bookingsResult.data as any[]) || [];
      const transactions = (transactionsResult.data as any[]) || [];
      const customerCount = customersResult.count || 0;
      const reviews = (reviewsResult.data as any[]) || [];

      const bookingRevenue = bookings
        .filter(b => b.status !== 'cancelled')
        .reduce((sum, b) => sum + Number(b.total_price), 0);

      const posRevenue = transactions
        .filter(t => t.transaction_type === 'sale')
        .reduce((sum, t) => sum + Number(t.total), 0);

      const totalRevenue = bookingRevenue + posRevenue;

      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

      const pendingBookings = bookings.filter(b => b.status === 'pending').length;

      setStats({
        totalRevenue,
        totalBookings: bookings.length,
        totalCustomers: customerCount,
        averageRating: avgRating,
        merchandiseSold: transactions.length,
        pendingBookings,
      });
    } catch (error: any) {
      const isAbort = 
        error.name === 'AbortError' || 
        error.code === 20 ||
        error.code === '20' ||
        error.message?.includes('AbortError') ||
        error.message?.includes('aborted') ||
        error.details?.includes('AbortError') ||
        error.details?.includes('aborted');

      if (!isAbort) {
        console.error('Error fetching analytics:', error);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  const StatCard = ({ icon: Icon, label, value, color, trend }: any) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <span className="flex items-center gap-1 text-sm font-medium text-green-600">
            <TrendingUp className="w-4 h-4" />
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-1">{value}</h3>
      <p className="text-sm text-slate-600">{label}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Analytics Dashboard</h3>
          <p className="text-slate-600 mt-1">Track your business performance</p>
        </div>
        <div className="flex gap-2">
          {(['week', 'month', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-primary-500 text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={formatPrice(stats.totalRevenue)}
          color="bg-green-600"
        />
        <StatCard
          icon={Calendar}
          label="Total Bookings"
          value={stats.totalBookings}
          color="bg-primary-500"
        />
        <StatCard
          icon={Users}
          label="Total Customers"
          value={stats.totalCustomers}
          color="bg-purple-600"
        />
        <StatCard
          icon={ShoppingCart}
          label="Merchandise Sold"
          value={stats.merchandiseSold}
          color="bg-orange-600"
        />
        <StatCard
          icon={Star}
          label="Average Rating"
          value={stats.averageRating.toFixed(1)}
          color="bg-yellow-600"
        />
        <StatCard
          icon={Calendar}
          label="Pending Bookings"
          value={stats.pendingBookings}
          color="bg-red-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Quick Insights</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
              <div>
                <p className="text-sm text-slate-600">Booking Conversion Rate</p>
                <p className="text-2xl font-bold text-primary-500">
                  {stats.totalBookings > 0
                    ? ((stats.totalBookings / stats.totalCustomers) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary-500" />
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm text-slate-600">Average Revenue per Booking</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatPrice(stats.totalBookings > 0
                    ? (stats.totalRevenue / stats.totalBookings)
                    : 0)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Performance Metrics</h4>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-600">Customer Satisfaction</span>
                <span className="font-semibold">{stats.averageRating.toFixed(1)}/5.0</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="bg-yellow-600 h-3 rounded-full transition-all"
                  style={{ width: `${(stats.averageRating / 5) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-600">Booking Completion</span>
                <span className="font-semibold">
                  {stats.totalBookings > 0
                    ? (((stats.totalBookings - stats.pendingBookings) / stats.totalBookings) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full transition-all"
                  style={{
                    width: stats.totalBookings > 0
                      ? `${((stats.totalBookings - stats.pendingBookings) / stats.totalBookings) * 100}%`
                      : '0%'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
