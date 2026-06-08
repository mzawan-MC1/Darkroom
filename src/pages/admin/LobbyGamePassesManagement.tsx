import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatPrice } from '../../lib/currencyUtils';
import { Ticket, Clock, Search, Filter, CheckCircle, XCircle, QrCode, Plus, X } from 'lucide-react';
import AdminPagination from '../../components/AdminPagination';

interface LobbyGamePass {
  id: string;
  pass_code: string;
  lobby_game_id: string | null;
  order_id: string | null;
  customer_name: string | null;
  hours_purchased: number;
  start_time: string | null;
  end_time: string | null;
  qr_code_url: string | null;
  status: string | null;
  created_at: string;
  lobby_games: {
    name: string;
  } | null;
}

interface LobbyGame {
  id: string;
  name: string;
  hourly_price: number;
}

export default function LobbyGamePassesManagement() {
  const { user } = useAuth();
  const [passes, setPasses] = useState<LobbyGamePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalItems, setTotalItems] = useState(0);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [lobbyGames, setLobbyGames] = useState<LobbyGame[]>([]);
  const [creating, setCreating] = useState(false);

  const [createForm, setCreateForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    lobby_game_id: '',
    hours_purchased: 1,
    payment_status: 'pending',
    payment_method: '',
    amount_paid: 0,
  });

  useEffect(() => {
    fetchPasses();
  }, [currentPage, pageSize, searchTerm, statusFilter]);

  useEffect(() => {
    fetchLobbyGames();
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearchTerm((prev) => (prev === searchInput ? prev : searchInput));
      setCurrentPage((prev) => (prev === 1 ? prev : 1));
    }, 300);

    return () => clearTimeout(handle);
  }, [searchInput]);

  const fetchLobbyGames = async () => {
    try {
      const { data, error } = await supabase
        .from('lobby_games')
        .select('id, name, hourly_price')
        .eq('is_available', true)
        .order('name');

      if (error) throw error;
      setLobbyGames(data || []);
    } catch (error) {
      console.error('Error fetching lobby games:', error);
    }
  };

  const fetchPasses = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('lobby_game_passes')
        .select(`
          *,
          lobby_games(name)
        `, { count: 'exact' });

      // Apply Search
      if (searchTerm) {
        query = query.or(`pass_code.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%`);
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
      setPasses(data || []);
    } catch (error) {
      console.error('Error fetching passes:', error);
      alert('Error loading passes');
    } finally {
      setLoading(false);
    }
  };

  const handleActivatePass = async (passId: string) => {
    if (!confirm('Activate this pass? This will start the timer.')) return;

    try {
      const pass = passes.find(p => p.id === passId);
      if (!pass) return;

      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + pass.hours_purchased * 60 * 60 * 1000);
      const durationMinutes = pass.hours_purchased * 60;

      const { error } = await (supabase
        .from('lobby_game_passes') as any)
        .update({
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          activated_at: startTime.toISOString(),
          expires_at: endTime.toISOString(),
          is_active: true,
          duration_minutes: durationMinutes,
          status: 'active',
        })
        .eq('id', passId);

      if (error) throw error;
      alert('Pass activated successfully!');
      fetchPasses();
    } catch (error) {
      console.error('Error activating pass:', error);
      alert('Error activating pass');
    }
  };

  const handleExpirePass = async (passId: string) => {
    if (!confirm('Mark this pass as expired?')) return;

    try {
      const { error } = await (supabase
        .from('lobby_game_passes') as any)
        .update({
          status: 'expired',
          is_active: false
        })
        .eq('id', passId);

      if (error) throw error;
      alert('Pass expired successfully!');
      fetchPasses();
    } catch (error) {
      console.error('Error expiring pass:', error);
      alert('Error expiring pass');
    }
  };

  const handleCreatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const selectedGame = lobbyGames.find(g => g.id === createForm.lobby_game_id);
      const hourlyPrice = selectedGame ? Number(selectedGame.hourly_price) : 0;
      const subtotal = hourlyPrice * createForm.hours_purchased;
      const vatAmount = subtotal * 0.05;
      const totalAmount = subtotal + vatAmount;

      // Calculate start and end times for the booking (needed for trigger)
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + createForm.hours_purchased * 60 * 60 * 1000);

      // Format times as HH:MM:SS for time columns
      const formatTime = (date: Date) => {
        return date.toTimeString().split(' ')[0]; // Returns HH:MM:SS
      };

      const bookingData = {
        booking_type: 'general',
        booking_status: createForm.payment_status === 'paid' ? 'confirmed' : 'pending',
        customer_name: createForm.customer_name,
        customer_email: createForm.customer_email,
        customer_phone: createForm.customer_phone,
        lobby_game_id: createForm.lobby_game_id || null,
        number_of_players: 1,
        start_time: formatTime(startTime),
        end_time: formatTime(endTime),
        subtotal,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        final_amount: totalAmount,
        payment_status: createForm.payment_status,
        payment_method: createForm.payment_status === 'paid' ? createForm.payment_method : null,
        booking_date: new Date().toISOString().split('T')[0],
      };

      const { data: booking, error: bookingError } = await (supabase
        .from('bookings') as any)
        .insert([bookingData])
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Invoice is automatically created by database trigger
      // If payment status is 'paid', find the invoice and update its status
      if (createForm.payment_status === 'paid') {
        // Wait a moment for the trigger to complete
        await new Promise(resolve => setTimeout(resolve, 500));

        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .select('id, invoice_number, total_amount')
          .eq('booking_id', booking.id)
          .maybeSingle();

        if (invoiceError) throw invoiceError;

        if (invoice) {
          const invoiceData = invoice as any;
          const { error: paymentError } = await supabase.rpc('update_invoice_status', {
            p_invoice_id: invoiceData.id,
            p_new_status: 'paid',
            p_payment_method: createForm.payment_method,
            p_amount_paid: createForm.amount_paid || totalAmount,
            p_payment_reference: null,
            p_updated_by: user?.id || null,
          } as any);

          if (paymentError) throw paymentError;

          // Send payment confirmation email
          try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: createForm.customer_email,
                template_key: 'payment_confirmation',
                variables: {
                  customer_name: createForm.customer_name,
                  invoice_number: invoiceData.invoice_number,
                  amount_paid: formatPrice(createForm.amount_paid || totalAmount),
                  payment_method: createForm.payment_method,
                  payment_date: new Date().toLocaleDateString(),
                  game_name: selectedGame?.name || 'Lobby Game',
                  hours_purchased: createForm.hours_purchased.toString(),
                }
              })
            });

            if (!emailResponse.ok) {
              console.error('Failed to send payment confirmation email');
            }
          } catch (emailError) {
            console.error('Error sending payment confirmation email:', emailError);
            // Don't fail the entire operation if email fails
          }
        }
      }

      // Note: Lobby game pass is automatically created by database trigger
      // when a booking with lobby_game_id is inserted

      alert('Lobby game pass created successfully!');
      setShowCreateModal(false);
      resetCreateForm();
      fetchPasses();
    } catch (error: any) {
      console.error('Error creating pass:', error);
      alert(`Failed to create pass: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      lobby_game_id: '',
      hours_purchased: 1,
      payment_status: 'pending',
      payment_method: '',
      amount_paid: 0,
    });
  };

  const calculateTotal = () => {
    const selectedGame = lobbyGames.find(g => g.id === createForm.lobby_game_id);
    if (!selectedGame) return 0;
    const subtotal = Number(selectedGame.hourly_price) * createForm.hours_purchased;
    const vat = subtotal * 0.05;
    return subtotal + vat;
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'expired': return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'used': return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-400 border border-red-500/30';
      default: return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
    }
  };

  const isPassActive = (pass: LobbyGamePass) => {
    if (pass.status !== 'active' || !pass.end_time) return false;
    return new Date() < new Date(pass.end_time);
  };

  const getRemainingTime = (endTime: string) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m remaining`;
  };

  // Client-side filtering removed
  // const filteredPasses = ...

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Lobby Game Passes</h3>
          <p className="text-slate-300 mt-1">Manage and track all lobby game passes</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create New Pass
        </button>
      </div>

      <div className="bg-black/50 rounded-xl border border-red-900/30 mb-6 p-4 hover:border-primary-500/50 transition-colors">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by pass code, customer..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 bg-slate-900 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="used">Used</option>
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-slate-400 mb-6">
          Loading passes...
        </div>
      )}

      {passes.length === 0 ? (
        <div className="bg-black/50 rounded-xl border border-red-900/30 p-12 text-center hover:border-primary-500/50 transition-colors">
          <Ticket className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No passes found</h3>
          <p className="text-slate-400">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Passes will appear here when customers make purchases'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 rounded-xl border border-red-900/30 overflow-hidden hover:border-primary-500/50 transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black/50 border-b border-red-900/30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Pass Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Game
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-900/30">
                {passes.map((pass) => (
                  <tr key={pass.id} className="hover:bg-black/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-primary-500" />
                        <span className="font-mono text-sm text-white">{pass.pass_code}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {pass.customer_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {pass.lobby_games?.name || 'Any Game'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-white">
                        <Clock className="w-4 h-4 text-primary-500" />
                        {pass.hours_purchased} {pass.hours_purchased === 1 ? 'hour' : 'hours'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {pass.start_time ? (
                        <div>
                          <div className="text-white">
                            {new Date(pass.start_time).toLocaleString()}
                          </div>
                          {pass.end_time && isPassActive(pass) && (
                            <div className="text-green-400 font-medium">
                              {getRemainingTime(pass.end_time)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">Not started</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(pass.status)}`}>
                        {pass.status || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {pass.status === 'cancelled' ? (
                          <span className="text-slate-500 text-xs italic">No actions available</span>
                        ) : (
                          <>
                            {pass.status === 'pending' && (
                              <button
                                onClick={() => handleActivatePass(pass.id)}
                                className="flex items-center gap-1 px-3 py-1.5 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors border border-green-500/30"
                                title="Activate Pass"
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-xs font-medium">Activate</span>
                              </button>
                            )}
                            {pass.status === 'active' && pass.start_time && (
                              <button
                                onClick={() => handleExpirePass(pass.id)}
                                className="flex items-center gap-1 px-3 py-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/30"
                                title="Expire Pass"
                              >
                                <XCircle className="w-4 h-4" />
                                <span className="text-xs font-medium">Expire</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
      )}

      <div className="mt-6 bg-black/50 border border-primary-500/30 rounded-xl p-6 hover:border-primary-500/50 transition-colors">
        <h4 className="font-semibold text-primary-500 mb-3 flex items-center gap-2">
          <Ticket className="w-5 h-5" />
          Pass Management Guide
        </h4>
        <ul className="text-sm text-slate-300 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-primary-500 mt-0.5">•</span>
            <span>Passes are created automatically when customers purchase lobby game time online</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-500 mt-0.5">•</span>
            <span>Use "Create New Pass" to create passes for walk-in customers</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-500 mt-0.5">•</span>
            <span>Click "Activate" to start the timer when the customer arrives</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-500 mt-0.5">•</span>
            <span>Active passes show the remaining time until expiration</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-500 mt-0.5">•</span>
            <span>Use "Expire" to manually end a pass if needed</span>
          </li>
        </ul>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-red-900/30 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-primary-600 to-primary-700 p-6 rounded-t-xl flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Ticket className="w-6 h-6" />
                  Create Walk-In Pass
                </h2>
                <p className="text-slate-200 text-sm mt-1">Create a lobby game pass for walk-in customers</p>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
                className="text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePass} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-white mb-2">Customer Name *</label>
                  <input
                    type="text"
                    value={createForm.customer_name}
                    onChange={(e) => setCreateForm({ ...createForm, customer_name: e.target.value })}
                    className="w-full px-4 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Email</label>
                  <input
                    type="email"
                    value={createForm.customer_email}
                    onChange={(e) => setCreateForm({ ...createForm, customer_email: e.target.value })}
                    className="w-full px-4 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Phone</label>
                  <input
                    type="tel"
                    value={createForm.customer_phone}
                    onChange={(e) => setCreateForm({ ...createForm, customer_phone: e.target.value })}
                    className="w-full px-4 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Lobby Game</label>
                  <select
                    value={createForm.lobby_game_id}
                    onChange={(e) => setCreateForm({ ...createForm, lobby_game_id: e.target.value })}
                    className="w-full px-4 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Any Game</option>
                    {lobbyGames.map(game => (
                      <option key={game.id} value={game.id}>
                        {game.name} ({formatPrice(Number(game.hourly_price))}/hr)
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">Leave empty for flexible pass</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Hours *</label>
                  <input
                    type="number"
                    value={createForm.hours_purchased}
                    onChange={(e) => setCreateForm({ ...createForm, hours_purchased: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    min="1"
                    max="12"
                    required
                  />
                </div>
              </div>

              <div className="border-t border-red-900/30 pt-4">
                <h3 className="text-lg font-semibold text-white mb-4">Payment Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Payment Status *</label>
                    <select
                      value={createForm.payment_status}
                      onChange={(e) => setCreateForm({ ...createForm, payment_status: e.target.value })}
                      className="w-full px-4 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>

                  {createForm.payment_status === 'paid' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Payment Method *</label>
                        <select
                          value={createForm.payment_method}
                          onChange={(e) => setCreateForm({ ...createForm, payment_method: e.target.value })}
                          className="w-full px-4 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          required
                        >
                          <option value="">Select method...</option>
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="online">Online</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-white mb-2">Amount Paid *</label>
                        <input
                          type="number"
                          value={createForm.amount_paid}
                          onChange={(e) => setCreateForm({ ...createForm, amount_paid: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          step="0.01"
                          min="0"
                          required
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {createForm.lobby_game_id && (
                <div className="bg-black/30 border border-primary-500/30 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-white">
                    <span>Subtotal:</span>
                    <span className="font-semibold">
                      {formatPrice(
                        (lobbyGames.find(g => g.id === createForm.lobby_game_id)?.hourly_price || 0) * createForm.hours_purchased
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span>VAT (5%):</span>
                    <span className="font-semibold">
                      {formatPrice(
                        (lobbyGames.find(g => g.id === createForm.lobby_game_id)?.hourly_price || 0) * createForm.hours_purchased * 0.05
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-primary-500/30 pt-2 text-primary-400">
                    <span>Total:</span>
                    <span>{formatPrice(calculateTotal())}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-red-900/30">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }}
                  className="flex-1 px-4 py-2 border border-red-900/30 text-white rounded-lg hover:bg-black/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create Pass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
