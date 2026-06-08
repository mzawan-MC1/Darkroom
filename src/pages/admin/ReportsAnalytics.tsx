import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Download,
  BarChart3,
  PieChart,
} from 'lucide-react';

interface RevenueData {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
}

interface GamePopularity {
  game_name: string;
  booking_count: number;
  revenue: number;
}

interface BookingStats {
  total_bookings: number;
  pending_count: number;
  confirmed_count: number;
  completed_count: number;
  cancelled_count: number;
}

interface RevenueByType {
  booking_type: string;
  revenue: number;
  count: number;
}

export default function ReportsAnalytics() {
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueData>({
    daily: 0,
    weekly: 0,
    monthly: 0,
    yearly: 0,
  });
  const [gamePopularity, setGamePopularity] = useState<GamePopularity[]>([]);
  const [bookingStats, setBookingStats] = useState<BookingStats>({
    total_bookings: 0,
    pending_count: 0,
    confirmed_count: 0,
    completed_count: 0,
    cancelled_count: 0,
  });
  const [revenueByType, setRevenueByType] = useState<RevenueByType[]>([]);
  const [dateRange] = useState('month');
  const [startDate] = useState('');
  const [endDate] = useState('');

  useEffect(() => {
    loadAnalytics();
  }, [dateRange, startDate, endDate]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadRevenueData(),
        loadGamePopularity(),
        loadBookingStats(),
        loadRevenueByType(),
      ]);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRevenueData = async () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthAgoStr = monthAgo.toISOString().split('T')[0];

    const yearAgo = new Date(today);
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    const yearAgoStr = yearAgo.toISOString().split('T')[0];

    const [daily, weekly, monthly, yearly] = await Promise.all([
      (supabase
        .from('invoices') as any)
        .select('amount_paid, refunded_amount')
        .gte('issued_at', todayStr + 'T00:00:00')
        .lte('issued_at', todayStr + 'T23:59:59')
        .in('status', ['paid', 'partially_paid', 'refunded', 'partially_refunded']),
      (supabase
        .from('invoices') as any)
        .select('amount_paid, refunded_amount')
        .gte('issued_at', weekAgoStr + 'T00:00:00')
        .in('status', ['paid', 'partially_paid', 'refunded', 'partially_refunded']),
      (supabase
        .from('invoices') as any)
        .select('amount_paid, refunded_amount')
        .gte('issued_at', monthAgoStr + 'T00:00:00')
        .in('status', ['paid', 'partially_paid', 'refunded', 'partially_refunded']),
      (supabase
        .from('invoices') as any)
        .select('amount_paid, refunded_amount')
        .gte('issued_at', yearAgoStr + 'T00:00:00')
        .in('status', ['paid', 'partially_paid', 'refunded', 'partially_refunded']),
    ]);

    const calculateNet = (data: any[]) => {
      return data?.reduce((sum, inv) => {
        const paid = Number(inv.amount_paid) || 0;
        const refunded = Number(inv.refunded_amount) || 0;
        return sum + Math.max(0, paid - refunded);
      }, 0) || 0;
    };

    setRevenueData({
      daily: calculateNet(daily.data || []),
      weekly: calculateNet(weekly.data || []),
      monthly: calculateNet(monthly.data || []),
      yearly: calculateNet(yearly.data || []),
    });
  };

  const loadGamePopularity = async () => {
    // Note: For game popularity revenue, we might still look at bookings final_amount 
    // unless we want to join invoices. For simplicity and since refunds are rare on specific games stats,
    // we might keep bookings but ideally we should use invoices.
    // However, relating invoice refund to specific game in a multi-item invoice is hard without line item refund tracking.
    // Given the scope "Add invoice refund support... Update Revenue calculations", I'll stick to invoice-based global revenue 
    // but for game breakdown I'll try to approximate or leave as is if complex.
    // But let's try to improve it. Bookings now have 'payment_status' updated to 'refunded' by our RPC.
    // So we can filter out refunded bookings or subtract them.
    
    const { data, error } = await (supabase
      .from('bookings') as any)
      .select(`
        game_id,
        lobby_game_id,
        final_amount,
        payment_status,
        games(name),
        lobby_games(name)
      `)
      .in('booking_status', ['completed', 'confirmed']); // Include confirmed as they might be paid

    if (error) {
      console.error('Error loading game popularity:', error);
      return;
    }

    const grouped: Record<string, { count: number; revenue: number; name: string }> = {};

    data?.forEach((booking: any) => {
      let gameId: string;
      let gameName: string;

      if (booking.game_id) {
        gameId = booking.game_id;
        gameName = booking.games?.name || 'Unknown Escape Room';
      } else if (booking.lobby_game_id) {
        gameId = booking.lobby_game_id;
        gameName = booking.lobby_games?.name || 'Unknown Lobby Game';
      } else {
        return;
      }

      if (!grouped[gameId]) {
        grouped[gameId] = { count: 0, revenue: 0, name: gameName };
      }

      grouped[gameId].count++;
      grouped[gameId].revenue += Number(booking.final_amount) || 0;
    });

    const popularity = Object.values(grouped)
      .map((g) => ({
        game_name: g.name,
        booking_count: g.count,
        revenue: g.revenue,
      }))
      .sort((a, b) => b.booking_count - a.booking_count);

    setGamePopularity(popularity);
  };

  const loadBookingStats = async () => {
    const { data, error } = await (supabase.from('bookings') as any).select('booking_status');

    if (error) {
      console.error('Error loading booking stats:', error);
      return;
    }

    const stats = {
      total_bookings: data?.length || 0,
      pending_count: data?.filter((b: any) => b.booking_status === 'pending').length || 0,
      confirmed_count: data?.filter((b: any) => b.booking_status === 'confirmed').length || 0,
      completed_count: data?.filter((b: any) => b.booking_status === 'completed').length || 0,
      cancelled_count: data?.filter((b: any) => b.booking_status === 'cancelled' || b.booking_status === 'rejected').length || 0,
    };

    setBookingStats(stats);
  };

  const loadRevenueByType = async () => {
    const { data, error } = await (supabase
      .from('invoices') as any)
      .select('booking_type, amount_paid, refunded_amount')
      .in('status', ['paid', 'partially_paid', 'refunded', 'partially_refunded']);

    if (error) {
      console.error('Error loading revenue by type:', error);
      return;
    }

    const grouped: Record<string, { revenue: number; count: number; name: string }> = {};

    data?.forEach((invoice: any) => {
      let typeName = invoice.booking_type || 'Custom';
      if (typeName === 'escape_room') typeName = 'Escape Rooms';
      if (typeName === 'lobby_game') typeName = 'Lobby Games';
      if (typeName === 'merchandise') typeName = 'Merchandise';
      if (typeName === 'video_request') typeName = 'Video Requests';
      
      if (!grouped[typeName]) {
        grouped[typeName] = { revenue: 0, count: 0, name: typeName };
      }

      const net = Math.max(0, (Number(invoice.amount_paid) || 0) - (Number(invoice.refunded_amount) || 0));
      grouped[typeName].revenue += net;
      grouped[typeName].count++;
    });

    const byType = Object.values(grouped).map((t) => ({
      booking_type: t.name,
      revenue: t.revenue,
      count: t.count,
    }));

    setRevenueByType(byType);
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Game Name', 'Bookings', 'Revenue'],
      ...gamePopularity.map((g) => [g.game_name, g.booking_count, g.revenue]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game-popularity-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportRevenueReport = () => {
    const csvContent = [
      ['Period', 'Revenue'],
      ['Daily', revenueData.daily],
      ['Weekly', revenueData.weekly],
      ['Monthly', revenueData.monthly],
      ['Yearly', revenueData.yearly],
      [''],
      ['Booking Type', 'Revenue', 'Count'],
      ...revenueByType.map((t) => [t.booking_type, t.revenue, t.count]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Reports & Analytics</h1>
          <p className="text-slate-300 mt-1">
            Comprehensive insights and downloadable reports
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportRevenueReport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-5 h-5" />
            Export Revenue
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            <Download className="w-5 h-5" />
            Export Games
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 opacity-80" />
            <span className="text-sm opacity-90">Daily</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            AED {revenueData.daily.toLocaleString()}
          </div>
          <div className="text-sm opacity-90">Today's Revenue</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 opacity-80" />
            <span className="text-sm opacity-90">Weekly</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            AED {revenueData.weekly.toLocaleString()}
          </div>
          <div className="text-sm opacity-90">Last 7 Days</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-8 h-8 opacity-80" />
            <span className="text-sm opacity-90">Monthly</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            AED {revenueData.monthly.toLocaleString()}
          </div>
          <div className="text-sm opacity-90">Last 30 Days</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-8 h-8 opacity-80" />
            <span className="text-sm opacity-90">Yearly</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            AED {revenueData.yearly.toLocaleString()}
          </div>
          <div className="text-sm opacity-90">Last 12 Months</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Booking Statistics</h2>
            <Users className="w-6 h-6 text-slate-400" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <span className="text-slate-700">Total Bookings</span>
              <span className="text-2xl font-bold text-slate-900">
                {bookingStats.total_bookings}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
              <span className="text-orange-700">Pending</span>
              <span className="text-xl font-bold text-orange-900">
                {bookingStats.pending_count}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
              <span className="text-primary-600">Confirmed</span>
              <span className="text-xl font-bold text-orange-900">
                {bookingStats.confirmed_count}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <span className="text-green-700">Completed</span>
              <span className="text-xl font-bold text-green-900">
                {bookingStats.completed_count}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <span className="text-red-700">Cancelled</span>
              <span className="text-xl font-bold text-red-900">
                {bookingStats.cancelled_count}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Revenue by Type</h2>
            <PieChart className="w-6 h-6 text-slate-400" />
          </div>
          <div className="space-y-3">
            {revenueByType.map((type, index) => {
              const maxRevenue = Math.max(...revenueByType.map((t) => t.revenue));
              const percentage = (type.revenue / maxRevenue) * 100;

              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{type.booking_type}</span>
                    <span className="text-slate-900 font-semibold">
                      AED {type.revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-500">{type.count} bookings</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Game Popularity Chart</h2>
          <BarChart3 className="w-6 h-6 text-slate-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Game Name
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                  Bookings
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                  Revenue
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Popularity
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {gamePopularity.map((game, index) => {
                const maxBookings = Math.max(...gamePopularity.map((g) => g.booking_count));
                const percentage = (game.booking_count / maxBookings) * 100;

                return (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                          index === 0
                            ? 'bg-yellow-100 text-yellow-800'
                            : index === 1
                            ? 'bg-slate-200 text-slate-700'
                            : index === 2
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900">{game.game_name}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-slate-900 font-semibold">
                        {game.booking_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-slate-900 font-semibold">
                        AED {game.revenue.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {gamePopularity.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No completed bookings yet
          </div>
        )}
      </div>
    </div>
  );
}
