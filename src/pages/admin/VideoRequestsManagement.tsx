import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Video, Clock, Mail, Search, Filter, Edit3, Eye, Calendar, CheckCircle, XCircle, Clock3, MessageCircle, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AdminPagination from '../../components/AdminPagination';

interface VideoRequest {
  id: string;
  user_id: string | null;
  booking_id: string | null;
  booking_reference?: string | null;
  invoice_id?: string | null;
  full_name: string;
  email: string;
  phone: string;
  game_name: string;
  played_date: string | null;
  played_time: string | null;
  video_type: 'short' | 'long';
  video_type_detail?: string | null;
  price: number;
  delivery_method: 'email' | 'whatsapp';
  request_method?: string | null;
  payment_status?: string | null;
  visit_at?: string | null;
  player_count?: number | null;
  notes: string | null;
  admin_notes: string | null;
  status: 'pending' | 'processing' | 'ready' | 'delivered' | 'cancelled' | 'rejected';
  created_at: string;
  special_instructions?: string | null;
}

type ManualVideoType = 'Short Video' | 'Full Video' | 'Raw Recording' | 'Custom Edited Video';
type ManualRequestMethod = 'Reception' | 'Phone' | 'WhatsApp' | 'Email' | 'Online';
type ManualStatus = 'Pending' | 'Processing' | 'Ready' | 'Delivered' | 'Cancelled' | 'Rejected';
type ManualPaymentStatus = 'Unpaid' | 'Paid' | 'Refunded';

interface CustomerSearchResult {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

interface BookingSearchResult {
  id: string;
  booking_number: string | null;
  booking_date: string | null;
  start_time: string | null;
  number_of_players: number | null;
  booking_status: string | null;
  user_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  games?: { name: string | null } | null;
  lobby_games?: { name: string | null } | null;
}

export default function VideoRequestsManagement() {
  const { } = useAuth();
  const [requests, setRequests] = useState<VideoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<VideoRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');
  const [newPaymentStatus, setNewPaymentStatus] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createMode, setCreateMode] = useState<'linked' | 'walk_in'>('linked');
  const [lookupTerm, setLookupTerm] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [customerResults, setCustomerResults] = useState<CustomerSearchResult[]>([]);
  const [bookingResults, setBookingResults] = useState<BookingSearchResult[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [customerBookings, setCustomerBookings] = useState<BookingSearchResult[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const [createForm, setCreateForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    game_name: '',
    booking_reference: '',
    video_type: 'Short Video' as ManualVideoType,
    price: '',
    request_method: 'Reception' as ManualRequestMethod,
    notes: '',
    status: 'Pending' as ManualStatus,
    payment_status: 'Unpaid' as ManualPaymentStatus,
    visit_date: '',
    visit_time: '',
  });
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchRequests();
  }, [currentPage, pageSize, searchTerm, statusFilter]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearchTerm((prev) => (prev === searchInput ? prev : searchInput));
      setCurrentPage((prev) => (prev === 1 ? prev : 1));
    }, 300);

    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    if (!showCreateModal) return;
    setCreateMode('linked');
    setLookupTerm('');
    setLookupLoading(false);
    setCustomerResults([]);
    setBookingResults([]);
    setSelectedCustomer(null);
    setCustomerBookings([]);
    setSelectedBookingId('');
  }, [showCreateModal]);

  useEffect(() => {
    if (!showCreateModal) return;
    if (createMode !== 'linked') return;
    const term = lookupTerm.trim();
    if (!term) {
      setCustomerResults([]);
      setBookingResults([]);
      return;
    }

    const handle = setTimeout(async () => {
      setLookupLoading(true);
      try {
        const [customersRes, bookingsRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, full_name, email, phone')
            .or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
            .limit(8),
          supabase
            .from('bookings')
            .select('id, booking_number, booking_date, start_time, number_of_players, booking_status, user_id, customer_name, customer_email, customer_phone, games(name), lobby_games(name)')
            .ilike('booking_number', `%${term}%`)
            .limit(8),
        ]);

        if (customersRes.error) throw customersRes.error;
        if (bookingsRes.error) throw bookingsRes.error;

        setCustomerResults((customersRes.data as any) || []);
        setBookingResults((bookingsRes.data as any) || []);
      } catch (error) {
        console.error('Error searching customers/bookings:', error);
        setCustomerResults([]);
        setBookingResults([]);
      } finally {
        setLookupLoading(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [lookupTerm, showCreateModal, createMode]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('video_requests')
        .select('*', { count: 'exact' });

      // Apply Search
      if (searchTerm) {
        query = query.or(
          `full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,game_name.ilike.%${searchTerm}%,booking_reference.ilike.%${searchTerm}%,request_method.ilike.%${searchTerm}%,payment_status.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%,admin_notes.ilike.%${searchTerm}%`
        );
      }

      // Apply Status Filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply Pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      
      query = query
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      
      setTotalItems(count || 0);
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching video requests:', error);
      alert('Error loading video requests');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'processing': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'ready': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'delivered': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock3 className="w-4 h-4" />;
      case 'processing': return <Clock className="w-4 h-4" />;
      case 'ready': return <CheckCircle className="w-4 h-4" />;
      case 'delivered': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <Clock3 className="w-4 h-4" />;
    }
  };

  // Client-side filtering removed
  // const filteredRequests = ...

  const openEditModal = (request: VideoRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.admin_notes || '');
    setNewStatus(request.status);
    setNewPaymentStatus(request.payment_status || 'unpaid');
    setShowModal(true);
  };

  const mapManualVideoTypeToDb = (type: ManualVideoType): 'short' | 'long' => {
    if (type === 'Short Video') return 'short';
    return 'long';
  };

  const mapManualVideoTypeDetailToDb = (type: ManualVideoType) => {
    switch (type) {
      case 'Short Video': return 'short_video';
      case 'Full Video': return 'full_video';
      case 'Raw Recording': return 'raw_recording';
      case 'Custom Edited Video': return 'custom_edited_video';
      default: return null;
    }
  };

  const mapManualStatusToDb = (status: ManualStatus) => {
    switch (status) {
      case 'Pending': return 'pending';
      case 'Processing': return 'processing';
      case 'Ready': return 'ready';
      case 'Delivered': return 'delivered';
      case 'Cancelled': return 'cancelled';
      case 'Rejected': return 'rejected';
      default: return 'pending';
    }
  };

  const mapRequestMethodToDb = (method: ManualRequestMethod) => {
    switch (method) {
      case 'Reception': return 'reception';
      case 'Phone': return 'phone';
      case 'WhatsApp': return 'whatsapp';
      case 'Email': return 'email';
      case 'Online': return 'online';
      default: return 'online';
    }
  };

  const mapPaymentStatusToDb = (paymentStatus: ManualPaymentStatus) => {
    switch (paymentStatus) {
      case 'Paid': return 'paid';
      case 'Refunded': return 'refunded';
      case 'Unpaid': return 'unpaid';
      default: return 'unpaid';
    }
  };

  const mapRequestMethodToDelivery = (method: ManualRequestMethod): 'email' | 'whatsapp' => {
    return method === 'WhatsApp' ? 'whatsapp' : 'email';
  };

  const loadBookingsForCustomer = async (customerId: string) => {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, booking_number, booking_date, start_time, number_of_players, booking_status, user_id, customer_name, customer_email, customer_phone, games(name), lobby_games(name)')
      .eq('user_id', customerId)
      .in('booking_status', ['confirmed', 'completed'])
      .order('booking_date', { ascending: false })
      .limit(20);

    if (error) throw error;
    setCustomerBookings((data as any) || []);
  };

  const applyBookingToForm = (booking: BookingSearchResult) => {
    const gameName = booking.games?.name || booking.lobby_games?.name || '';
    const bookingNumber = booking.booking_number || '';
    const bookingDate = booking.booking_date || '';
    const bookingTime = booking.start_time || '';

    setSelectedBookingId(booking.id);
    setCreateForm((prev) => ({
      ...prev,
      game_name: gameName || prev.game_name,
      booking_reference: bookingNumber || prev.booking_reference,
      visit_date: bookingDate || prev.visit_date,
      visit_time: bookingTime || prev.visit_time,
    }));
  };

  const selectCustomerFromLookup = async (customer: CustomerSearchResult) => {
    setSelectedCustomer(customer);
    setCustomerResults([]);
    setBookingResults([]);
    setCreateForm((prev) => ({
      ...prev,
      customer_name: customer.full_name || '',
      customer_email: customer.email || '',
      customer_phone: customer.phone || '',
    }));
    setSelectedBookingId('');
    await loadBookingsForCustomer(customer.id);
  };

  const selectBookingFromLookup = async (booking: BookingSearchResult) => {
    setBookingResults([]);
    setCustomerResults([]);
    applyBookingToForm(booking);

    if (booking.user_id) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .eq('id', booking.user_id)
        .maybeSingle();
      if (!error && data) {
        const customer = data as any as CustomerSearchResult;
        setSelectedCustomer(customer);
        setCreateForm((prev) => ({
          ...prev,
          customer_name: customer.full_name || prev.customer_name,
          customer_email: customer.email || prev.customer_email,
          customer_phone: customer.phone || prev.customer_phone,
        }));
        await loadBookingsForCustomer(customer.id);
        return;
      }
    }

    setSelectedCustomer(null);
    setCreateMode('walk_in');
    setCreateForm((prev) => ({
      ...prev,
      customer_name: booking.customer_name || prev.customer_name,
      customer_email: booking.customer_email || prev.customer_email,
      customer_phone: booking.customer_phone || prev.customer_phone,
    }));
  };

  const createRequest = async () => {
    const customerName = createForm.customer_name.trim();
    const customerEmail = createForm.customer_email.trim();
    const customerPhone = createForm.customer_phone.trim();
    const gameName = createForm.game_name.trim();
    const bookingReference = createForm.booking_reference.trim();
    const notes = createForm.notes.trim();
    const priceValue = Number(createForm.price);

    if (!customerName) {
      alert('Customer Name is required');
      return;
    }
    if (!customerEmail && !customerPhone) {
      alert('Customer Phone or Email is required');
      return;
    }
    if (!gameName) {
      alert('Game / Room Name is required');
      return;
    }
    if (!createForm.video_type) {
      alert('Video Type is required');
      return;
    }
    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      alert('Price must be a number greater than 0');
      return;
    }
    if (!createForm.request_method) {
      alert('Request Method is required');
      return;
    }
    if (!createForm.status) {
      alert('Status is required');
      return;
    }
    if (!createForm.payment_status) {
      alert('Payment Status is required');
      return;
    }
    if (!createForm.visit_date || !createForm.visit_time) {
      alert('Date & Time of Visit is required');
      return;
    }

    setCreateSubmitting(true);
    try {
      if (createMode === 'linked' && selectedCustomer && customerBookings.length > 0 && !selectedBookingId) {
        alert('Select a booking for this customer or switch to Walk-in/Manual');
        return;
      }

      let bookingId: string | null = selectedBookingId || null;
      if (!bookingId && bookingReference) {
        const { data: bookingMatch, error: bookingLookupError } = await supabase
          .from('bookings')
          .select('id')
          .eq('booking_number', bookingReference)
          .maybeSingle();
        const bookingMatchId = (bookingMatch as { id: string } | null)?.id;
        if (!bookingLookupError && bookingMatchId) {
          bookingId = bookingMatchId;
        }
      }

      const visitAt = new Date(`${createForm.visit_date}T${createForm.visit_time}`).toISOString();
      const selectedBooking = bookingId
        ? (customerBookings.find((b) => b.id === bookingId) || bookingResults.find((b) => b.id === bookingId) || null)
        : null;
      const bookingNumber = selectedBooking?.booking_number || (bookingReference || null);

      const insertPayload: any = {
        user_id: selectedCustomer?.id || null,
        booking_id: bookingId,
        booking_reference: bookingNumber,
        full_name: customerName,
        email: customerEmail || '',
        phone: customerPhone || '',
        game_name: gameName,
        played_date: createForm.visit_date,
        played_time: createForm.visit_time,
        video_type: mapManualVideoTypeToDb(createForm.video_type),
        video_type_detail: mapManualVideoTypeDetailToDb(createForm.video_type),
        price: priceValue,
        delivery_method: mapRequestMethodToDelivery(createForm.request_method),
        request_method: mapRequestMethodToDb(createForm.request_method),
        payment_status: mapPaymentStatusToDb(createForm.payment_status),
        visit_at: visitAt,
        player_count: selectedBooking?.number_of_players ?? null,
        notes: notes || null,
        status: mapManualStatusToDb(createForm.status),
        admin_notes: null,
      };

      const { error } = await (supabase
        .from('video_requests') as any)
        .insert([insertPayload]);

      if (error) throw error;

      setShowCreateModal(false);
      setCreateForm({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        game_name: '',
        booking_reference: '',
        video_type: 'Short Video',
        price: '',
        request_method: 'Reception',
        notes: '',
        status: 'Pending',
        payment_status: 'Unpaid',
        visit_date: '',
        visit_time: '',
      });

      setCurrentPage(1);
      await fetchRequests();
      alert('Video request created successfully');
    } catch (error) {
      console.error('Error creating video request:', error);
      alert('Failed to create video request');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const updateRequest = async () => {
    if (!selectedRequest) return;

    try {
      const { error } = await (supabase
        .from('video_requests') as any)
        .update({
          status: newStatus,
          payment_status: newPaymentStatus,
          admin_notes: adminNotes,
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      await fetchRequests();
      setShowModal(false);
      setSelectedRequest(null);
      alert('Request updated successfully');
    } catch (error) {
      console.error('Error updating request:', error);
      alert('Error updating request');
    }
  };

  const getVideoTypeLabel = (type: string) => {
    switch (type) {
      case 'short_video': return 'Short Video';
      case 'full_video': return 'Full Video';
      case 'raw_recording': return 'Raw Recording';
      case 'custom_edited_video': return 'Custom Edited Video';
      case 'short': return 'Short Video';
      case 'long': return 'Long Video';
      default: return type;
    }
  };

  const getDeliveryMethodIcon = (method: string) => {
    switch (method) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'whatsapp': return <MessageCircle className="w-4 h-4" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Video Requests</h1>
          <p className="text-slate-400 mt-1">Manage video recording requests from customers</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-400">
            Total: {totalItems} requests
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Video Request
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, booking reference, or phone..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-8 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="ready">Ready</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-slate-400">
          Loading requests...
        </div>
      )}

      {/* Requests List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Request
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-500/20 border border-primary-500/30 rounded-lg flex items-center justify-center">
                        <Video className="w-5 h-5 text-primary-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">
                          {request.game_name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {getVideoTypeLabel(request.video_type_detail || request.video_type)} • AED {request.price}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {request.full_name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {request.email}
                      </div>
                      <div className="text-xs text-slate-400">
                        {request.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      {getDeliveryMethodIcon(request.delivery_method)}
                      <span className="capitalize">{request.delivery_method}</span>
                    </div>
                    {(request.request_method || request.payment_status || request.booking_reference) && (
                      <div className="text-xs text-slate-500 mt-1 max-w-xs truncate">
                        {[request.booking_reference ? `Ref: ${request.booking_reference}` : null, request.request_method ? `Method: ${request.request_method}` : null, request.payment_status ? `Payment: ${request.payment_status}` : null].filter(Boolean).join(' • ')}
                      </div>
                    )}
                    {request.notes && (
                      <div className="text-xs text-slate-500 mt-1 max-w-xs truncate">
                        {request.notes}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                      {getStatusIcon(request.status)}
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(request.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(request.created_at).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(request)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        title="Edit Request"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No video requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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

      {/* Edit Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">Update Video Request</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="ready">Ready</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Payment Status
                </label>
                <select
                  value={newPaymentStatus}
                  onChange={(e) => setNewPaymentStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Admin Notes
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Add notes about this request..."
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={updateRequest}
                className="flex-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
              >
                Update Request
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Add Video Request</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCreateMode('linked')}
                className={`px-4 py-2 rounded-lg border transition-colors ${createMode === 'linked' ? 'bg-primary-500/20 border-primary-500/40 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'}`}
              >
                Link to Customer/Booking
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreateMode('walk_in');
                  setSelectedCustomer(null);
                  setCustomerBookings([]);
                  setSelectedBookingId('');
                  setLookupTerm('');
                  setCustomerResults([]);
                  setBookingResults([]);
                }}
                className={`px-4 py-2 rounded-lg border transition-colors ${createMode === 'walk_in' ? 'bg-primary-500/20 border-primary-500/40 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'}`}
              >
                Walk-in / Manual
              </button>
            </div>

            {createMode === 'linked' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">Search Customer or Booking</label>
                <input
                  type="text"
                  value={lookupTerm}
                  onChange={(e) => setLookupTerm(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Name, email, phone, or booking reference..."
                />

                {lookupLoading && (
                  <div className="mt-2 text-sm text-slate-400">Searching…</div>
                )}

                {(customerResults.length > 0 || bookingResults.length > 0) && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-black/30 border border-slate-800 rounded-lg p-3">
                      <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">Customers</div>
                      <div className="space-y-2">
                        {customerResults.map((c) => (
                          <button
                            type="button"
                            key={c.id}
                            onClick={() => selectCustomerFromLookup(c)}
                            className="w-full text-left px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700"
                          >
                            <div className="text-sm text-white">{c.full_name || 'Unnamed'}</div>
                            <div className="text-xs text-slate-400">{[c.email, c.phone].filter(Boolean).join(' • ')}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="bg-black/30 border border-slate-800 rounded-lg p-3">
                      <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">Bookings</div>
                      <div className="space-y-2">
                        {bookingResults.map((b) => (
                          <button
                            type="button"
                            key={b.id}
                            onClick={() => selectBookingFromLookup(b)}
                            className="w-full text-left px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700"
                          >
                            <div className="text-sm text-white">{b.booking_number || 'Booking'}</div>
                            <div className="text-xs text-slate-400">
                              {[
                                b.games?.name || b.lobby_games?.name,
                                b.booking_date ? `Date: ${b.booking_date}` : null,
                                b.start_time ? `Time: ${b.start_time}` : null,
                              ].filter(Boolean).join(' • ')}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {selectedCustomer && (
                  <div className="mt-3 bg-black/30 border border-slate-800 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm text-white">{selectedCustomer.full_name || 'Customer'}</div>
                        <div className="text-xs text-slate-400">{[selectedCustomer.email, selectedCustomer.phone].filter(Boolean).join(' • ')}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(null);
                          setCustomerBookings([]);
                          setSelectedBookingId('');
                        }}
                        className="px-3 py-1 text-sm bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700"
                      >
                        Clear
                      </button>
                    </div>

                    {customerBookings.length > 0 && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-slate-300 mb-2">Select Booking</label>
                        <select
                          value={selectedBookingId}
                          onChange={(e) => {
                            const id = e.target.value;
                            setSelectedBookingId(id);
                            const booking = customerBookings.find((b) => b.id === id);
                            if (booking) applyBookingToForm(booking);
                          }}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="">Select a booking…</option>
                          {customerBookings.map((b) => (
                            <option key={b.id} value={b.id}>
                              {(b.booking_number || 'Booking')}{b.booking_date ? ` • ${b.booking_date}` : ''}{b.start_time ? ` • ${b.start_time}` : ''}{(b.games?.name || b.lobby_games?.name) ? ` • ${b.games?.name || b.lobby_games?.name}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">Customer Name</label>
                <input
                  type="text"
                  value={createForm.customer_name}
                  onChange={(e) => setCreateForm({ ...createForm, customer_name: e.target.value })}
                  disabled={createMode === 'linked' && !!selectedCustomer}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60"
                  placeholder="Customer full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Customer Email</label>
                <input
                  type="email"
                  value={createForm.customer_email}
                  onChange={(e) => setCreateForm({ ...createForm, customer_email: e.target.value })}
                  disabled={createMode === 'linked' && !!selectedCustomer}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Customer Phone</label>
                <input
                  type="tel"
                  value={createForm.customer_phone}
                  onChange={(e) => setCreateForm({ ...createForm, customer_phone: e.target.value })}
                  disabled={createMode === 'linked' && !!selectedCustomer}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60"
                  placeholder="+971..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">Game / Room Name</label>
                <input
                  type="text"
                  value={createForm.game_name}
                  onChange={(e) => setCreateForm({ ...createForm, game_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Abandoned Hospital (Ward 404)"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">Booking Reference / Walk-in Reference</label>
                <input
                  type="text"
                  value={createForm.booking_reference}
                  onChange={(e) => setCreateForm({ ...createForm, booking_reference: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Optional"
                />
                <p className="text-xs text-slate-500 mt-1">If it matches a booking number, it will be linked automatically.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Video Type</label>
                <select
                  value={createForm.video_type}
                  onChange={(e) => setCreateForm({ ...createForm, video_type: e.target.value as ManualVideoType })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="Short Video">Short Video</option>
                  <option value="Full Video">Full Video</option>
                  <option value="Raw Recording">Raw Recording</option>
                  <option value="Custom Edited Video">Custom Edited Video</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Price (AED)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={createForm.price}
                  onChange={(e) => setCreateForm({ ...createForm, price: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Request Method</label>
                <select
                  value={createForm.request_method}
                  onChange={(e) => setCreateForm({ ...createForm, request_method: e.target.value as ManualRequestMethod })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="Reception">Reception</option>
                  <option value="Phone">Phone</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Email">Email</option>
                  <option value="Online">Online</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Payment Status</label>
                <select
                  value={createForm.payment_status}
                  onChange={(e) => setCreateForm({ ...createForm, payment_status: e.target.value as ManualPaymentStatus })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="Unpaid">Unpaid</option>
                  <option value="Paid">Paid</option>
                  <option value="Refunded">Refunded</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as ManualStatus })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="Ready">Ready</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Date of Visit</label>
                <input
                  type="date"
                  value={createForm.visit_date}
                  onChange={(e) => setCreateForm({ ...createForm, visit_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Time of Visit</label>
                <input
                  type="time"
                  value={createForm.visit_time}
                  onChange={(e) => setCreateForm({ ...createForm, visit_time: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">Notes / Special Instructions</label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={createRequest}
                disabled={createSubmitting}
                className="flex-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-slate-700 disabled:text-slate-300 text-white rounded-lg font-medium transition-colors"
              >
                {createSubmitting ? 'Creating...' : 'Create Request'}
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {selectedRequest && !showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Request Details</h3>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Booking ID</label>
                <p className="text-white font-mono text-sm">{selectedRequest.booking_id || 'N/A'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Booking Reference</label>
                  <p className="text-white text-sm">{selectedRequest.booking_reference || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Invoice ID</label>
                  <p className="text-white font-mono text-sm">{selectedRequest.invoice_id || 'N/A'}</p>
                </div>
              </div>
              
              <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Customer</label>
                  <p className="text-white">{selectedRequest.full_name}</p>
                  <p className="text-slate-400 text-sm">{selectedRequest.email}</p>
                  <p className="text-slate-400 text-sm">{selectedRequest.phone}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Video Type</label>
                  <p className="text-white">{getVideoTypeLabel(selectedRequest.video_type_detail || selectedRequest.video_type)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Price</label>
                  <p className="text-white">AED {selectedRequest.price}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Request Method</label>
                  <p className="text-white text-sm">{selectedRequest.request_method || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Payment Status</label>
                  <p className="text-white text-sm">{selectedRequest.payment_status || 'N/A'}</p>
                </div>
              </div>
              
              <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Delivery Method</label>
                  <div className="flex items-center gap-2 text-white capitalize">
                    {getDeliveryMethodIcon(selectedRequest.delivery_method)}
                    {selectedRequest.delivery_method}
                  </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Status</label>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedRequest.status)}`}>
                  {getStatusIcon(selectedRequest.status)}
                  {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                </span>
              </div>
              
              {selectedRequest.notes && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Special Instructions</label>
                  <p className="text-white text-sm">{selectedRequest.notes}</p>
                </div>
              )}

              {(selectedRequest.played_date || selectedRequest.played_time) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Visit Date</label>
                    <p className="text-white text-sm">{selectedRequest.played_date || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Visit Time</label>
                    <p className="text-white text-sm">{selectedRequest.played_time || 'N/A'}</p>
                  </div>
                </div>
              )}
              
              {selectedRequest.admin_notes && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Admin Notes</label>
                  <p className="text-white text-sm">{selectedRequest.admin_notes}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Created</label>
                  <p className="text-white text-sm">{new Date(selectedRequest.created_at).toLocaleString()}</p>
                </div>
                
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => openEditModal(selectedRequest)}
                className="flex-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
              >
                Edit Request
              </button>
              <button
                onClick={() => setSelectedRequest(null)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
