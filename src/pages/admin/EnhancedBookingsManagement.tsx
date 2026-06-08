import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Eye, Check, X, CheckCircle, ClipboardCheck, Pencil, Ban, Search } from 'lucide-react';
import SlotBasedBookingModal from '../../components/SlotBasedBookingModal';
import AdminWaiverCollectionModal from '../../components/AdminWaiverCollectionModal';
import BookingWaiversSection from '../../components/BookingWaiversSection';
import MarkBookingCompletedModal from '../../components/MarkBookingCompletedModal';
import { formatPrice } from '../../lib/currencyUtils';
import { sendBookingConfirmationEmail, getBookingEmailData, sendAdminBookingNotification } from '../../lib/bookingEmailService';
import AdminPagination from '../../components/AdminPagination';

interface BookingType {
  id: string;
  name: string;
  description: string;
  price_multiplier: number;
  requires_approval: boolean;
}

interface Booking {
  id: string;
  booking_number: string;
  user_id: string;
  game_id: string;
  booking_type_id: string;
  booking_date: string;
  start_time: string;
  number_of_players: number;
  final_amount: number;
  booking_status: string;
  payment_status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  billing_address?: {
    billing_name?: string;
    billing_address_line_1?: string;
    billing_address_line_2?: string;
    billing_city?: string;
    billing_emirate_or_state?: string;
    billing_country?: string;
    billing_postal_code?: string;
    billing_vat_or_tax_number?: string;
    // Fallback properties for customer-created bookings
    name?: string;
    address_line_1?: string;
    address_line_2?: string;
    city?: string;
    emirate?: string;
    country?: string;
    postal_code?: string;
    vat_number?: string;
  } | null;
  special_requests: string | null;
  referral_source: string | null;
  cancellation_reason: string | null;
  rejection_reason: string | null;
  difficulty_level: string;
  requires_approval: boolean;
  approval_status: string;
  created_at: string;
  games: { name: string } | null;
  booking_types: { name: string } | null;
  waiver_signed_count?: number;
  waiver_total_count?: number;
  waiver_all_signed?: boolean;
}

export default function EnhancedBookingsManagement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingTypes, setBookingTypes] = useState<BookingType[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  const [pendingApprovals, setPendingApprovals] = useState<Booking[]>([]);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    loadData();
  }, [currentPage, pageSize, searchTerm, statusFilter, typeFilter, dateFrom, dateTo]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearchTerm((prev) => (prev === searchInput ? prev : searchInput));
      setCurrentPage((prev) => (prev === 1 ? prev : 1));
    }, 300);

    return () => clearTimeout(handle);
  }, [searchInput]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Build Booking Query with Filters and Pagination
      let query = supabase
        .from('bookings')
        .select('*, games(name), booking_types(name)', { count: 'exact' });

      // Apply Search
      if (searchTerm) {
        query = query.or(`customer_name.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%,booking_number.ilike.%${searchTerm}%`);
      }

      // Apply Filters
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending') {
          // Special case for pending: check approval_status if it exists or booking_status
          // The logic in original code was: statusFilter === booking.approval_status
          // But approval_status is 'approved', 'pending', 'rejected'.
          // booking_status is 'confirmed', 'pending', etc.
          // Let's stick to filtering by approval_status if that's what was intended, OR booking_status.
          // Original code: booking.approval_status === statusFilter
          query = query.eq('approval_status', statusFilter);
        } else {
           // For approved/rejected/etc, use approval_status as well?
           // Original code used approval_status for filter.
           query = query.eq('approval_status', statusFilter);
        }
      }

      if (typeFilter !== 'all') {
        query = query.eq('booking_type_id', typeFilter);
      }

      if (dateFrom) {
        query = query.gte('booking_date', dateFrom);
      }

      if (dateTo) {
        query = query.lte('booking_date', dateTo);
      }

      // Apply Pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      
      query = query
        .order('created_at', { ascending: false })
        .range(from, to);

      const [bookingsRes, typesRes, gamesRes, pendingRes] = await Promise.all([
        query,
        supabase.from('booking_types').select('*'),
        supabase.from('games').select('*').eq('status', 'active'),
        supabase
          .from('bookings')
          .select('*, games(name), booking_types(name)')
          .eq('requires_approval', true)
          .eq('approval_status', 'pending')
          .order('created_at', { ascending: false })
          .limit(3)
      ]);

      if (bookingsRes.error) throw bookingsRes.error;
      if (typesRes.error) throw typesRes.error;
      if (gamesRes.error) throw gamesRes.error;
      if (pendingRes.error) throw pendingRes.error;

      setTotalItems(bookingsRes.count || 0);
      setPendingApprovals((pendingRes.data as any[]) || []);

      const bookingsWithWaiverData = await Promise.all(
        (bookingsRes.data as any[] || []).map(async (booking: any) => {
          if (booking.game_id) {
            const { data: waiverData } = await supabase
              .from('waivers')
              .select('waiver_status')
              .eq('booking_id', booking.id);

            const waivers = waiverData as any[] || [];
            const signedCount = waivers.filter(w => w.waiver_status === 'signed').length || 0;
            const totalCount = booking.number_of_players || 0;

            return {
              ...booking,
              waiver_signed_count: signedCount,
              waiver_total_count: totalCount,
              waiver_all_signed: signedCount === totalCount && totalCount > 0,
            };
          }
          return booking;
        })
      );

      setBookings(bookingsWithWaiverData);
      setBookingTypes(typesRes.data || []);
      setGames(gamesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveBooking = async (bookingId: string) => {
    try {
      const { error } = await (supabase
        .from('bookings') as any)
        .update({
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          booking_status: 'confirmed',
        })
        .eq('id', bookingId);

      if (error) throw error;

      await sendConfirmation(bookingId, 'email');
      loadData();
      alert('Booking approved and confirmation sent!');
    } catch (error) {
      console.error('Error approving booking:', error);
      alert('Failed to approve booking');
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      const { error } = await (supabase
        .from('bookings') as any)
        .update({
          approval_status: 'rejected',
          booking_status: 'rejected',
          rejection_reason: reason,
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (error) {
        console.error('Error rejecting booking:', error);
        alert(`Failed to reject booking: ${error.message}\n\nDetails: ${JSON.stringify(error, null, 2)}`);
        throw error;
      }

      await sendBookingEmail(bookingId, 'booking_cancellation');
      loadData();
      alert('Booking rejected and notification sent');
    } catch (error: any) {
      console.error('Error rejecting booking:', error);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    const reason = prompt('Enter cancellation reason:');
    if (!reason) return;

    if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('You must be logged in to cancel a booking.');
        return;
      }

      // 1. Update booking status
      const { error: bookingError } = await (supabase
        .from('bookings') as any)
        .update({
          booking_status: 'cancelled',
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString(),
          cancelled_by: session.user.id
        })
        .eq('id', bookingId);

      if (bookingError) throw bookingError;

      // 2. Update invoice status if exists (optional but recommended)
      // Check if invoice exists
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, status')
        .eq('booking_id', bookingId);
      
      if (invoices && invoices.length > 0) {
        // Update all associated invoices to 'cancelled' or 'void'
        // Assuming 'cancelled' is a valid status based on user request
        const { error: invoiceError } = await (supabase
          .from('invoices') as any)
          .update({ status: 'cancelled' })
          .eq('booking_id', bookingId);
          
        if (invoiceError) {
           console.error('Error updating invoice status:', invoiceError);
           // We don't stop the flow here, as booking is already cancelled
        }
      }

      await sendBookingEmail(bookingId, 'booking_cancellation');
      loadData();
      alert('Booking cancelled and notification sent');
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      alert(`Failed to cancel booking: ${error.message || 'Unknown error'}`);
    }
  };

  const handleMarkCompleted = async (bookingId: string) => {
    try {
      const booking = bookings.find(b => b.id === bookingId);

      if (!booking) {
        alert('Booking not found');
        return;
      }

      if (booking?.game_id) {
        const { data: waiverStatusData } = await supabase
          .rpc('get_booking_waiver_status', { p_booking_id: bookingId } as any);
        
        const waiverStatus = (waiverStatusData || []) as any[];

        if (waiverStatus && waiverStatus.length > 0 && !waiverStatus[0].all_signed) {
          alert(
            `Cannot mark booking as completed. ${waiverStatus[0].signed_count} of ${waiverStatus[0].total_players} waivers signed. All players must sign waivers before completing the booking.`
          );
          return;
        }
      }

      setSelectedBooking(booking);
      setShowCompletedModal(true);
    } catch (error) {
      console.error('Error preparing to mark booking as completed:', error);
      alert('Failed to open completion form');
    }
  };

  const sendBookingEmail = async (bookingId: string, templateKey: 'booking_confirmation' | 'booking_cancellation') => {
    try {
      const { data: bookingResult, error: fetchError } = await supabase
        .from('bookings')
        .select('*, games(name), booking_types(name)')
        .eq('id', bookingId)
        .single();

      if (fetchError || !bookingResult) {
        console.error('Error fetching booking:', fetchError);
        return;
      }

      const booking = bookingResult as any;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const gameName = booking.games?.name || 'Game';
      const bookingDate = new Date(booking.booking_date).toLocaleDateString();
      const bookingTime = booking.start_time || '';

      const variables: Record<string, string> = {
        site_name: 'Escape Room',
        customer_name: booking.customer_name,
        booking_number: booking.booking_number,
        game_name: gameName,
        booking_date: bookingDate,
        booking_time: bookingTime,
        year: new Date().getFullYear().toString(),
        site_url: window.location.origin,
      };

      if (templateKey === 'booking_confirmation') {
        variables.player_count = booking.number_of_players?.toString() || '0';
        variables.total_amount = `AED ${booking.final_amount?.toLocaleString() || '0'}`;
        variables.booking_url = `${window.location.origin}/customer-portal`;
      } else if (templateKey === 'booking_cancellation') {
        variables.cancellation_reason = booking.cancellation_reason || booking.rejection_reason || 'No reason provided';
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: booking.customer_email,
          template_key: templateKey,
          variables,
        }),
      });
    } catch (error) {
      console.error('Error sending booking email:', error);
    }
  };

  const sendConfirmation = async (bookingId: string, type: 'email' | 'whatsapp') => {
    try {
      const { error } = await (supabase.from('booking_confirmations') as any).insert({
        booking_id: bookingId,
        confirmation_type: type,
        status: 'sent',
      });

      if (error) throw error;

      if (type === 'email') {
        const emailData = await getBookingEmailData(bookingId);
        if (emailData) {
          // Send to customer
          sendBookingConfirmationEmail(emailData).catch(err => 
            console.error('Failed to send customer confirmation:', err)
          );
          
          // Notify admin about confirmation
          sendAdminBookingNotification('booking_confirmation', emailData).catch(err =>
            console.error('Failed to send admin notification:', err)
          );
        }
      }
    } catch (error) {
      console.error('Error sending confirmation:', error);
    }
  };

  /*
  const generateInvoice = async (bookingId: string) => {
    try {
      console.log('Generating invoice for booking:', bookingId);

      const { data, error } = await supabase.rpc('create_invoice_for_booking', {
        booking_id_param: bookingId,
      } as any);

      if (error) {
        console.error('Supabase RPC error:', error);
        throw error;
      }

      console.log('Invoice generated successfully:', data);
      alert('Invoice generated successfully!');
      loadData();
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      const errorMessage = error.message || error.hint || error.details || 'Unknown error';
      alert(`Failed to generate invoice: ${errorMessage}`);
    }
  };
  */

  // Client-side filtering is removed in favor of server-side filtering
  // const filteredBookings = ...

  // pendingApprovals is now fetched separately

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Enhanced Bookings</h1>
          <p className="text-slate-300 mt-1">
            Manage all booking types with approvals and invoicing
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Booking
        </button>
      </div>

      {pendingApprovals.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h3 className="font-semibold text-orange-900 mb-2">
            Pending Approvals ({pendingApprovals.length})
          </h3>
          <div className="space-y-2">
            {pendingApprovals.slice(0, 3).map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between bg-white p-3 rounded-lg"
              >
                <div>
                  <span className="font-medium">{booking.customer_name}</span>
                  <span className="text-slate-600 text-sm ml-2">
                    {booking.booking_types?.name} - {booking.games?.name}
                  </span>
                  <span className="text-slate-500 text-sm ml-2">
                    {new Date(booking.booking_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveBooking(booking.id)}
                    className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    title="Approve"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRejectBooking(booking.id)}
                    className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    title="Reject"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search bookings..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Types</option>
            {bookingTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="From"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="To"
            />
          </div>
        </div>

        {loading && (
          <div className="text-sm text-slate-500 mb-3">
            Loading bookings...
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Booking #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Game
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Level
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Date & Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Waivers
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm">{booking.booking_number}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-slate-900">
                        {booking.customer_name}
                      </div>
                      <div className="text-sm text-slate-500">{booking.customer_email}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm">{booking.booking_types?.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm">{booking.games?.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      booking.difficulty_level === 'Normal'
                        ? 'bg-green-100 text-green-800'
                        : booking.difficulty_level === 'Hard'
                        ? 'bg-orange-100 text-orange-800'
                        : booking.difficulty_level === 'Nightmare'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {booking.difficulty_level || 'Normal'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <div>{new Date(booking.booking_date).toLocaleDateString()}</div>
                      <div className="text-slate-500">{booking.start_time}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        booking.booking_status === 'confirmed' || booking.booking_status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : booking.booking_status === 'pending'
                          ? 'bg-orange-100 text-orange-800'
                          : booking.booking_status === 'completed'
                          ? 'bg-blue-100 text-blue-800'
                          : booking.booking_status === 'cancelled' || booking.booking_status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {booking.booking_status === 'rejected' ? 'Cancelled' : booking.booking_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {booking.game_id ? (
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowWaiverModal(true);
                        }}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          booking.waiver_all_signed
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        }`}
                        title="Manage Waivers"
                      >
                        <ClipboardCheck className="w-3 h-3" />
                        {booking.waiver_signed_count || 0}/{booking.waiver_total_count || 0}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">N/A</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowDetailsModal(true);
                        }}
                        className="p-2 text-primary-500 hover:bg-orange-50 rounded-lg"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowEditModal(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit Booking"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {booking.booking_status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproveBooking(booking.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRejectBooking(booking.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {(booking.booking_status === 'confirmed' || booking.booking_status === 'approved') && (
                        <>
                          <button
                            onClick={() => handleMarkCompleted(booking.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Mark as Completed"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCancelBooking(booking.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Cancel Booking"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {bookings.length === 0 && (
          <div className="text-center py-12 text-slate-500">No bookings found</div>
        )}

        <AdminPagination
          currentPage={currentPage}
          totalPages={Math.ceil(totalItems / pageSize)}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </div>

      {showDetailsModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
              <h2 className="text-2xl font-bold">Booking Details</h2>
              <p className="text-blue-100 text-sm mt-1">#{selectedBooking.booking_number}</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="text-sm text-slate-600 mb-1">Customer Name</div>
                  <div className="font-medium">{selectedBooking.customer_name}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="text-sm text-slate-600 mb-1">Email</div>
                  <div className="font-medium">{selectedBooking.customer_email}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="text-sm text-slate-600 mb-1">Phone</div>
                  <div className="font-medium">{selectedBooking.customer_phone || 'N/A'}</div>
                </div>

                {selectedBooking.billing_address && (
                  <div className="bg-slate-50 p-4 rounded-lg col-span-2">
                    <div className="text-sm text-slate-600 mb-1">Billing Address</div>
                    <div className="font-medium text-sm">
                      {(selectedBooking.billing_address.billing_name || selectedBooking.billing_address.name) && (selectedBooking.billing_address.billing_name || selectedBooking.billing_address.name) !== selectedBooking.customer_name && (
                        <div>{selectedBooking.billing_address.billing_name || selectedBooking.billing_address.name}</div>
                      )}
                      <div>{selectedBooking.billing_address.billing_address_line_1 || selectedBooking.billing_address.address_line_1}</div>
                      {(selectedBooking.billing_address.billing_address_line_2 || selectedBooking.billing_address.address_line_2) && (
                        <div>{selectedBooking.billing_address.billing_address_line_2 || selectedBooking.billing_address.address_line_2}</div>
                      )}
                      <div>
                        {[
                          selectedBooking.billing_address.billing_city || selectedBooking.billing_address.city,
                          selectedBooking.billing_address.billing_emirate_or_state || selectedBooking.billing_address.emirate,
                          selectedBooking.billing_address.billing_country || selectedBooking.billing_address.country
                        ].filter(Boolean).join(', ')}
                      </div>
                      {(selectedBooking.billing_address.billing_postal_code || selectedBooking.billing_address.postal_code) && (
                        <div>PO Box: {selectedBooking.billing_address.billing_postal_code || selectedBooking.billing_address.postal_code}</div>
                      )}
                      {(selectedBooking.billing_address.billing_vat_or_tax_number || selectedBooking.billing_address.vat_number) && (
                        <div className="text-xs text-slate-500 mt-1">TRN/VAT: {selectedBooking.billing_address.billing_vat_or_tax_number || selectedBooking.billing_address.vat_number}</div>
                      )}
                    </div>
                  </div>
                )}
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="text-sm text-slate-600 mb-1">Booking Type</div>
                  <div className="font-medium">{selectedBooking.booking_types?.name}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="text-sm text-slate-600 mb-1">Game</div>
                  <div className="font-medium">{selectedBooking.games?.name}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="text-sm text-slate-600 mb-1">Date & Time</div>
                  <div className="font-medium">
                    {new Date(selectedBooking.booking_date).toLocaleDateString()}
                    <br />
                    {selectedBooking.start_time}
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="text-sm text-slate-600 mb-1">Players</div>
                  <div className="font-medium">{selectedBooking.number_of_players}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="text-sm text-slate-600 mb-1">Total Amount</div>
                  <div className="font-medium">{formatPrice(selectedBooking.final_amount)}</div>
                </div>
              </div>

              {selectedBooking.special_requests && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <div className="text-sm font-medium text-yellow-900 mb-2">
                    Special Requests
                  </div>
                  <div className="text-sm text-yellow-800">
                    {selectedBooking.special_requests}
                  </div>
                </div>
              )}

              {selectedBooking.referral_source && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <div className="text-sm font-medium text-blue-900 mb-2">
                    Referral Source
                  </div>
                  <div className="text-sm text-blue-800">
                    {selectedBooking.referral_source}
                  </div>
                </div>
              )}

              {(selectedBooking.cancellation_reason || selectedBooking.rejection_reason) && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <div className="text-sm font-medium text-red-900 mb-2">
                    {selectedBooking.booking_status === 'rejected' ? 'Rejection Reason' : 'Cancellation Reason'}
                  </div>
                  <div className="text-sm text-red-800">
                    {selectedBooking.cancellation_reason || selectedBooking.rejection_reason}
                  </div>
                </div>
              )}

              {selectedBooking.game_id && (
                <div className="border-t border-slate-200 pt-6">
                  <BookingWaiversSection
                    bookingId={selectedBooking.id}
                    gameName={selectedBooking.games?.name || 'Escape Room'}
                    numberOfPlayers={selectedBooking.number_of_players}
                    onUpdate={loadData}
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedBooking(null);
                  }}
                  className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-slate-900">Create New Booking</h2>
              <p className="text-slate-600 mt-1">Select a game to start creating a booking</p>
            </div>
            <div className="p-6">
              {!selectedGame ? (
                <div className="space-y-4">
                  <div className="text-sm text-slate-600 mb-4">
                    Choose a game to create a booking:
                  </div>
                  {games.map((game) => (
                    <button
                      key={game.id}
                      onClick={() => setSelectedGame(game)}
                      className="w-full p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-orange-50 transition-colors text-left"
                    >
                      <div className="font-semibold text-slate-900">{game.name}</div>
                      <div className="text-sm text-slate-600 mt-1">
                        {game.min_players}-{game.max_players} players • {game.duration_minutes} minutes • {formatPrice(game.base_price)}/player
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <SlotBasedBookingModal
                  game={selectedGame}
                  isAdminBooking={true}
                  onClose={() => {
                    setShowCreateModal(false);
                    setSelectedGame(null);
                  }}
                  onBookingCreated={() => {
                    setShowCreateModal(false);
                    setSelectedGame(null);
                    loadData();
                  }}
                />
              )}
            </div>
            {!selectedGame && (
              <div className="p-6 border-t flex justify-end">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedGame(null);
                  }}
                  className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showEditModal && selectedBooking && (
        <SlotBasedBookingModal
          existingBooking={selectedBooking}
          isAdminBooking={true}
          onClose={() => {
            setShowEditModal(false);
            setSelectedBooking(null);
          }}
          onBookingCreated={() => {
            setShowEditModal(false);
            setSelectedBooking(null);
            loadData();
          }}
        />
      )}

      {showWaiverModal && selectedBooking && selectedBooking.game_id && selectedBooking.games && (
        <AdminWaiverCollectionModal
          bookingId={selectedBooking.id}
          bookingNumber={selectedBooking.booking_number}
          gameName={selectedBooking.games.name}
          numberOfPlayers={selectedBooking.number_of_players}
          onClose={() => setShowWaiverModal(false)}
          onUpdate={() => {
            loadData();
            setShowWaiverModal(false);
          }}
        />
      )}

      {showCompletedModal && selectedBooking && (
        <MarkBookingCompletedModal
          bookingId={selectedBooking.id}
          gameId={selectedBooking.game_id}
          isOpen={showCompletedModal}
          onClose={() => {
            setShowCompletedModal(false);
            setSelectedBooking(null);
          }}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
}
