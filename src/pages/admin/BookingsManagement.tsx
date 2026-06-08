import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Plus, Edit2, Trash2, Users, DollarSign, Search, Filter, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import SlotBasedBookingModal from '../../components/SlotBasedBookingModal';

interface Game {
  id: string;
  name: string;
  duration_minutes: number;
  base_price: number;
  min_players: number;
  max_players: number;
}

interface Participant {
  full_name: string;
  phone_number: string;
  age: number;
}

interface Booking {
  id: string;
  user_id: string;
  game_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  number_of_players: number;
  final_amount: number;
  booking_status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  special_requests: string | null;
  referral_source: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  created_at: string;
  profiles: { full_name: string; email: string } | null;
  games: { name: string } | null;
}

export default function BookingsManagement() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [allowOverbooking, setAllowOverbooking] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    game_id: '',
    booking_date: '',
    start_time: '',
    end_time: '',
    number_of_players: 2,
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    booking_status: 'pending' as 'pending' | 'confirmed' | 'completed' | 'cancelled',
    payment_status: 'pending' as 'pending' | 'paid' | 'refunded',
    special_requests: '',
    referral_source: '',
  });

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    fetchBookings(signal);
    fetchGames(signal);
    return () => controller.abort();
  }, []);

  const fetchBookings = async (signal?: AbortSignal) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          profiles!bookings_user_id_fkey(full_name, email),
          games(name)
        `)
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: false })
        .abortSignal(signal as AbortSignal);

      if (error) throw error;
      setBookings(data || []);
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
        console.error('Error fetching bookings:', error);
        alert('Error loading bookings');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  const fetchGames = async (signal?: AbortSignal) => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('id, name, duration_minutes, base_price, min_players, max_players')
        .eq('status', 'active')
        .order('name')
        .abortSignal(signal as AbortSignal);

      if (error) throw error;
      setGames(data || []);
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
        console.error('Error fetching games:', error);
      }
    }
  };

  const handleOpenModal = (booking?: Booking) => {
    if (booking) {
      setEditingBooking(booking);
      setFormData({
        game_id: booking.game_id,
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        number_of_players: booking.number_of_players,
        customer_name: booking.customer_name,
        customer_email: booking.customer_email,
        customer_phone: booking.customer_phone || '',
        booking_status: booking.booking_status,
        payment_status: booking.payment_status,
        special_requests: booking.special_requests || '',
        referral_source: booking.referral_source || '',
      });
    } else {
      setEditingBooking(null);
      setFormData({
        game_id: '',
        booking_date: '',
        start_time: '',
        end_time: '',
        number_of_players: 2,
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        booking_status: 'pending',
        payment_status: 'pending',
        special_requests: '',
        referral_source: '',
      });
      setParticipants([]);
    }
    setShowModal(true);
  };

  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    if (!startTime) return '';
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };

  const handleAddParticipant = () => {
    setParticipants([...participants, { full_name: '', phone_number: '', age: 18 }]);
  };

  const handleRemoveParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const handleParticipantChange = (index: number, field: keyof Participant, value: string | number) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], [field]: value };
    setParticipants(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('You must be logged in');
      return;
    }

    try {
      if (editingBooking) {
        const { error } = await (supabase
          .from('bookings') as any)
          .update({
            booking_date: formData.booking_date,
            start_time: formData.start_time,
            end_time: formData.end_time,
            number_of_players: formData.number_of_players,
            customer_name: formData.customer_name,
            customer_email: formData.customer_email,
            customer_phone: formData.customer_phone || null,
            booking_status: formData.booking_status,
            payment_status: formData.payment_status,
            special_requests: formData.special_requests || null,
            referral_source: formData.referral_source || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingBooking.id);

        if (error) throw error;
        alert('Booking updated successfully!');
      } else {
        const selectedGame = games.find(g => g.id === formData.game_id);
        if (!selectedGame) {
          alert('Please select a game');
          return;
        }

        if (participants.length !== formData.number_of_players) {
          alert(`Please add details for all ${formData.number_of_players} participants`);
          return;
        }

        const bookingNumber = `BK${Date.now()}`;
        const endTime = calculateEndTime(formData.start_time, selectedGame.duration_minutes);
        const totalAmount = selectedGame.base_price * formData.number_of_players;

        const { data: bookingResult, error: bookingError } = await (supabase
          .from('bookings') as any)
          .insert([{
            booking_number: bookingNumber,
            user_id: user.id,
            game_id: formData.game_id,
            booking_date: formData.booking_date,
            start_time: formData.start_time,
            end_time: endTime,
            number_of_players: formData.number_of_players,
            customer_name: formData.customer_name,
            customer_email: formData.customer_email,
            customer_phone: formData.customer_phone || null,
            special_requests: formData.special_requests || null,
            referral_source: formData.referral_source || null,
            total_amount: totalAmount,
            discount_amount: 0,
            final_amount: totalAmount,
            booking_status: formData.booking_status,
            payment_status: formData.payment_status,
            reminder_sent: false,
          }])
          .select()
          .single();

        if (bookingError) throw bookingError;

        const participantsData = participants.map(p => ({
          booking_id: bookingResult.id,
          full_name: p.full_name,
          phone_number: p.phone_number,
          age: p.age,
          waiver_signed: true,
          waiver_signed_at: new Date().toISOString(),
        }));

        const { error: participantsError } = await (supabase
          .from('booking_participants') as any)
          .insert(participantsData);

        if (participantsError) throw participantsError;

        alert('Booking created successfully! Booking number: ' + bookingNumber);
      }

      setShowModal(false);
      fetchBookings();
    } catch (error: any) {
      console.error('Error saving booking:', error);
      alert(error.message || 'Error saving booking');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this booking?')) return;

    try {
      const { error } = await (supabase
        .from('bookings') as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Booking deleted successfully!');
      fetchBookings();
    } catch (error) {
      console.error('Error deleting booking:', error);
      alert('Error deleting booking');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-primary-500/20 text-primary-400';
      case 'completed': return 'bg-primary-500/30 text-primary-300';
      case 'cancelled': return 'bg-red-500/30 text-red-400';
      default: return 'bg-primary-500/10 text-primary-300';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-primary-500/30 text-primary-300';
      case 'refunded': return 'bg-red-500/30 text-red-400';
      default: return 'bg-primary-500/10 text-primary-300';
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch =
      booking.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.games?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || booking.booking_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
          <h3 className="text-xl font-bold text-white">Bookings Management</h3>
          <p className="text-slate-400 mt-1">View and manage all bookings</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setAllowOverbooking(false);
              setShowSlotModal(true);
            }}
            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Booking
          </button>
          <button
            onClick={() => {
              setAllowOverbooking(true);
              setShowSlotModal(true);
            }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            title="Create booking even if slot is full"
          >
            <Plus className="w-5 h-5" />
            Add Booking (Override)
          </button>
        </div>
      </div>

      <div className="bg-black/50 rounded-xl shadow-sm border border-red-900/30 mb-6 p-4 hover:border-primary-500/50 hover:shadow-primary-500/20 transition-all">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by customer name, email, or game..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white placeholder-slate-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-slate-900 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {filteredBookings.length === 0 ? (
        <div className="bg-black/50 rounded-xl shadow-sm border border-red-900/30 p-12 text-center hover:border-primary-500/50 hover:shadow-primary-500/20 transition-all">
          <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No bookings found</h3>
          <p className="text-slate-400">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Bookings will appear here once customers start making reservations'}
          </p>
        </div>
      ) : (
        <div className="bg-black/50 rounded-xl shadow-sm border border-red-900/30 overflow-hidden hover:border-primary-500/50 hover:shadow-primary-500/20 transition-all">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900 border-b border-red-900/30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Game
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Players
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-black/30 divide-y divide-red-900/30">
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-white">
                          {booking.profiles?.full_name || 'Unknown'}
                        </div>
                        <div className="text-sm text-slate-400">{booking.profiles?.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {booking.games?.name || 'Unknown Game'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">
                        {new Date(booking.booking_date).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-slate-400">{booking.start_time} - {booking.end_time}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-white">
                        <Users className="w-4 h-4" />
                        {booking.number_of_players}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-white">
                        <DollarSign className="w-4 h-4" />
                        AED {booking.final_amount}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.booking_status)}`}>
                        {booking.booking_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(booking.payment_status)}`}>
                        {booking.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(booking)}
                          className="p-2 text-primary-400 hover:bg-slate-900 hover:text-primary-500 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(booking.id)}
                          className="p-2 text-red-400 hover:bg-red-900/50 hover:text-red-500 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-red-900/30 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-red-900/30">
              <h3 className="text-xl font-bold text-white">
                {editingBooking ? 'Edit Booking' : 'New Booking'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                {!editingBooking && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Select Game
                    </label>
                    <select
                      value={formData.game_id}
                      onChange={(e) => setFormData({ ...formData, game_id: e.target.value })}
                      className="w-full px-3 py-2 bg-black/50 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white"
                      required
                    >
                      <option value="">Choose a game...</option>
                      {games.map((game) => (
                        <option key={game.id} value={game.id}>
                          {game.name} - AED {game.base_price} ({game.duration_minutes} min)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      className="w-full px-3 py-2 bg-black/50 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Customer Email
                    </label>
                    <input
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                      className="w-full px-3 py-2 bg-black/50 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Customer Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                      className="w-full px-3 py-2 bg-black/50 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Booking Date
                    </label>
                    <input
                      type="date"
                      value={formData.booking_date}
                      onChange={(e) => setFormData({ ...formData, booking_date: e.target.value })}
                      className="w-full px-3 py-2 bg-black/50 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="w-full px-3 py-2 bg-black/50 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white"
                      required
                    />
                  </div>
                </div>

                {editingBooking && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="w-full px-3 py-2 bg-black/50 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Number of Players
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.number_of_players}
                    onChange={(e) => setFormData({ ...formData, number_of_players: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-black/50 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white"
                    required
                  />
                </div>

                {!editingBooking && (
                  <div className="border-t border-red-900/30 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-white">Participant Details</h4>
                        <p className="text-sm text-slate-400">Add details for all {formData.number_of_players} participants</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddParticipant}
                        disabled={participants.length >= formData.number_of_players}
                        className="flex items-center gap-2 px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors text-sm"
                      >
                        <UserPlus className="w-4 h-4" />
                        Add Participant
                      </button>
                    </div>

                    <div className="space-y-3">
                      {participants.map((participant, index) => (
                        <div key={index} className="bg-black/30 p-3 rounded-lg border border-red-900/30">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-sm font-semibold text-white">Participant {index + 1}</h5>
                            <button
                              type="button"
                              onClick={() => handleRemoveParticipant(index)}
                              className="p-1 text-red-400 hover:bg-red-900/50 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-300 mb-1">
                                Full Name
                              </label>
                              <input
                                type="text"
                                value={participant.full_name}
                                onChange={(e) => handleParticipantChange(index, 'full_name', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm bg-slate-900 border border-red-900/30 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-300 mb-1">
                                Phone Number
                              </label>
                              <input
                                type="tel"
                                value={participant.phone_number}
                                onChange={(e) => handleParticipantChange(index, 'phone_number', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm bg-slate-900 border border-red-900/30 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-300 mb-1">
                                Age
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="120"
                                value={participant.age}
                                onChange={(e) => handleParticipantChange(index, 'age', parseInt(e.target.value))}
                                className="w-full px-2 py-1.5 text-sm bg-slate-900 border border-red-900/30 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white"
                                required
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Booking Status
                    </label>
                    <select
                      value={formData.booking_status}
                      onChange={(e) => setFormData({ ...formData, booking_status: e.target.value as any })}
                      className="w-full px-3 py-2 bg-black/50 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Payment Status
                    </label>
                    <select
                      value={formData.payment_status}
                      onChange={(e) => setFormData({ ...formData, payment_status: e.target.value as any })}
                      className="w-full px-3 py-2 bg-black/50 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white"
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Special Requests
                  </label>
                  <textarea
                    value={formData.special_requests}
                    onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-black/50 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Where did you hear about us? (Optional)
                  </label>
                  <select
                    value={formData.referral_source}
                    onChange={(e) => setFormData({ ...formData, referral_source: e.target.value })}
                    className="w-full px-3 py-2 bg-black/50 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white"
                  >
                    <option value="">Select an option</option>
                    <option value="Google Search">Google Search</option>
                    <option value="Social Media (Instagram/Facebook/Twitter)">Social Media (Instagram/Facebook/Twitter)</option>
                    <option value="Friend/Family Recommendation">Friend/Family Recommendation</option>
                    <option value="Advertisement">Advertisement</option>
                    <option value="Walk-by">Walk-by</option>
                    <option value="Event/Exhibition">Event/Exhibition</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-red-900/30 text-slate-300 rounded-lg hover:bg-black/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  {editingBooking ? 'Update Booking' : 'Create Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSlotModal && (
        <SlotBasedBookingModal
          onClose={() => {
            setShowSlotModal(false);
            setAllowOverbooking(false);
          }}
          onBookingCreated={() => {
            fetchBookings();
          }}
          allowOverbooking={allowOverbooking}
        />
      )}
    </div>
  );
}
