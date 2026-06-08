import { useState, useEffect } from 'react';
import { Calendar, DollarSign, Users, Gamepad2, TrendingUp, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/currencyUtils';

interface DashboardStats {
  todayBookings: number;
  todayRevenue: number;
  totalGames: number;
  totalCustomers: number;
  weeklyBookings: number;
  monthlyRevenue: number;
  activeBookings: number;
  escapeRoomRevenue: number;
  lobbyGameRevenue: number;
  merchandiseRevenue: number;
  videoRequestRevenue: number;
}

interface RecentBooking {
  id: string;
  customer_name: string;
  booking_date: string;
  start_time: string;
  final_amount: number;
  booking_status: string;
  games: { name: string } | null;
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats>({
    todayBookings: 0,
    todayRevenue: 0,
    totalGames: 0,
    totalCustomers: 0,
    weeklyBookings: 0,
    monthlyRevenue: 0,
    activeBookings: 0,
    escapeRoomRevenue: 0,
    lobbyGameRevenue: 0,
    merchandiseRevenue: 0,
    videoRequestRevenue: 0,
  });
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    fetchDashboardData(signal);
    return () => controller.abort();
  }, []);

  const fetchDashboardData = async (signal?: AbortSignal) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [
        { count: todayBookingsCount },
        { data: todayRevenueData },
        { count: totalGamesCount },
        { count: totalCustomersCount },
        { count: weeklyBookingsCount },
        { data: monthlyRevenueData },
        { count: activeBookingsCount },
        { data: recentBookingsData },
        { data: revenueByType },
      ] = await Promise.all([
        supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('booking_date', today)
          .abortSignal(signal as AbortSignal),

        supabase
          .from('invoices')
          .select('amount_paid, refunded_amount')
          .gte('issued_at', today + 'T00:00:00')
          .lte('issued_at', today + 'T23:59:59')
          .in('status', ['paid', 'partially_paid', 'refunded', 'partially_refunded'])
          .abortSignal(signal as AbortSignal),

        supabase
          .from('games')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .abortSignal(signal as AbortSignal),

        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .abortSignal(signal as AbortSignal),

        supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .gte('booking_date', weekAgo)
          .abortSignal(signal as AbortSignal),

        supabase
          .from('invoices')
          .select('amount_paid, refunded_amount')
          .gte('issued_at', monthAgo + 'T00:00:00')
          .in('status', ['paid', 'partially_paid', 'refunded', 'partially_refunded'])
          .abortSignal(signal as AbortSignal),

        supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .in('booking_status', ['pending', 'confirmed'])
          .gte('booking_date', today)
          .abortSignal(signal as AbortSignal),

        supabase
          .from('bookings')
          .select('id, customer_name, booking_date, start_time, final_amount, booking_status, games(name)')
          .order('created_at', { ascending: false })
          .limit(5)
          .abortSignal(signal as AbortSignal),

        supabase
          .from('invoices')
          .select('amount_paid, refunded_amount, booking_type')
          .gte('issued_at', monthAgo + 'T00:00:00')
          .in('status', ['paid', 'partially_paid', 'refunded', 'partially_refunded'])
          .abortSignal(signal as AbortSignal),
      ]);

      if (signal?.aborted) return;

      const calculateNetRevenue = (invoices: any[]) => {
        return invoices?.reduce((sum, inv) => {
          const paid = Number(inv.amount_paid) || 0;
          const refunded = Number(inv.refunded_amount) || 0;
          return sum + Math.max(0, paid - refunded);
        }, 0) || 0;
      };

      const todayRevenue = calculateNetRevenue(todayRevenueData || []);
      const monthlyRevenue = calculateNetRevenue(monthlyRevenueData || []);

      const revenueByTypeData = (revenueByType as any[]) || [];

      const escapeRoomRevenue = calculateNetRevenue(revenueByTypeData.filter(inv => inv.booking_type === 'escape_room'));
      const lobbyGameRevenue = calculateNetRevenue(revenueByTypeData.filter(inv => inv.booking_type === 'lobby_game'));
      const merchandiseRevenue = calculateNetRevenue(revenueByTypeData.filter(inv => inv.booking_type === 'merchandise'));
      const videoRequestRevenue = calculateNetRevenue(revenueByTypeData.filter(inv => inv.booking_type === 'video_request'));

      setStats({
        todayBookings: todayBookingsCount || 0,
        todayRevenue,
        totalGames: totalGamesCount || 0,
        totalCustomers: totalCustomersCount || 0,
        weeklyBookings: weeklyBookingsCount || 0,
        monthlyRevenue,
        activeBookings: activeBookingsCount || 0,
        escapeRoomRevenue,
        lobbyGameRevenue,
        merchandiseRevenue,
        videoRequestRevenue,
      });

      setRecentBookings(recentBookingsData || []);
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
        console.error('Error fetching dashboard data:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: "Today's Bookings",
      value: stats.todayBookings.toString(),
      icon: <Calendar className="w-6 h-6" />,
      bgColor: 'bg-orange-50',
      textColor: 'text-primary-500',
      trend: `${stats.activeBookings} active`,
    },
    {
      label: "Today's Revenue",
      value: formatPrice(stats.todayRevenue),
      icon: <DollarSign className="w-6 h-6" />,
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      trend: `${formatPrice(stats.monthlyRevenue)} this month`,
    },
    {
      label: 'Total Games',
      value: stats.totalGames.toString(),
      icon: <Gamepad2 className="w-6 h-6" />,
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      trend: 'Active games',
    },
    {
      label: 'Total Customers',
      value: stats.totalCustomers.toString(),
      icon: <Users className="w-6 h-6" />,
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      trend: `${stats.weeklyBookings} bookings this week`,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-orange-100 text-orange-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.bgColor} p-3 rounded-lg`}>
                <div className={stat.textColor}>{stat.icon}</div>
              </div>
            </div>
            <p className="text-slate-600 text-sm font-medium mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900 mb-1">{stat.value}</p>
            <p className="text-xs text-slate-500">{stat.trend}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Recent Bookings</h3>
            <Clock className="w-5 h-5 text-slate-400" />
          </div>
          {recentBookings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No bookings yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 text-sm">{booking.customer_name}</p>
                    <p className="text-xs text-slate-600">
                      {booking.games?.name || 'Unknown Game'} • {new Date(booking.booking_date).toLocaleDateString()} at {booking.start_time}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold text-slate-900 text-sm">{formatPrice(booking.final_amount)}</p>
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(booking.booking_status)}`}>
                      {booking.booking_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Quick Stats</h3>
            <TrendingUp className="w-5 h-5 text-slate-400" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-orange-900">Active Bookings</p>
                <p className="text-xs text-primary-600">Pending & Confirmed</p>
              </div>
              <p className="text-2xl font-bold text-primary-500">{stats.activeBookings}</p>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-green-900">Monthly Revenue</p>
                <p className="text-xs text-green-700">Last 30 days</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{formatPrice(stats.monthlyRevenue)}</p>
            </div>
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-purple-900">Weekly Bookings</p>
                <p className="text-xs text-purple-700">Last 7 days</p>
              </div>
              <p className="text-2xl font-bold text-purple-600">{stats.weeklyBookings}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Revenue Breakdown</h3>
            <DollarSign className="w-5 h-5 text-slate-400" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border-l-4 border-blue-600">
              <div>
                <p className="text-sm font-medium text-blue-900">Escape Rooms</p>
                <p className="text-xs text-blue-700">Last 30 days</p>
              </div>
              <p className="text-xl font-bold text-blue-600">{formatPrice(stats.escapeRoomRevenue)}</p>
            </div>
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border-l-4 border-amber-600">
              <div>
                <p className="text-sm font-medium text-amber-900">Lobby Games</p>
                <p className="text-xs text-amber-700">Last 30 days</p>
              </div>
              <p className="text-xl font-bold text-amber-600">{formatPrice(stats.lobbyGameRevenue)}</p>
            </div>
            <div className="flex items-center justify-between p-4 bg-pink-50 rounded-lg border-l-4 border-pink-600">
              <div>
                <p className="text-sm font-medium text-pink-900">Merchandise</p>
                <p className="text-xs text-pink-700">Last 30 days</p>
              </div>
              <p className="text-xl font-bold text-pink-600">{formatPrice(stats.merchandiseRevenue)}</p>
            </div>
            <div className="flex items-center justify-between p-4 bg-teal-50 rounded-lg border-l-4 border-teal-600">
              <div>
                <p className="text-sm font-medium text-teal-900">Video Requests</p>
                <p className="text-xs text-teal-700">Last 30 days</p>
              </div>
              <p className="text-xl font-bold text-teal-600">{formatPrice(stats.videoRequestRevenue)}</p>
            </div>
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatPrice(stats.escapeRoomRevenue + stats.lobbyGameRevenue + stats.merchandiseRevenue + stats.videoRequestRevenue)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
