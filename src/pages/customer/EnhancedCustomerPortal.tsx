import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/currencyUtils';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import WaiverSigningModal from '../../components/WaiverSigningModal';
import { getWaiverPdfUrl } from '../../lib/waiverPdfGenerator';
import {
  User,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  ShoppingBag,
  LogOut,
  Edit,
  Lock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Timer,
  Trophy,
  Package,
  Download,
  Mail,
  Video,
} from 'lucide-react';

interface Booking {
  id: string;
  booking_number: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  number_of_players: number;
  booking_status: string;
  payment_status: string;
  final_amount: number;
  game: {
    id: string;
    name: string;
    image_url: string;
  };
  has_waiver?: boolean;
  waiver_signed_count?: number;
  waiver_total_count?: number;
  all_waivers_signed?: boolean;
  time_to_finish_minutes?: number;
  achievement_note?: string;
  achievements?: Achievement[];
}

interface Achievement {
  id: string;
  title: string;
  short_description?: string;
  style_tag?: string;
}

interface LobbyBooking {
  id: string;
  booking_number: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  booking_status: string;
  payment_status: string;
  final_amount: number;
  lobby_game_name: string;
  lobby_game_image: string;
  pass_code: string | null;
  pass_status: string | null;
  pass_is_active: boolean | null;
  pass_activated_at: string | null;
  pass_expires_at: string | null;
  duration_minutes: number;
}

interface LobbyPass {
  id: string;
  pass_code: string;
  hours_purchased: number;
  duration_minutes: number;
  status: string;
  activated_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  lobby_game: {
    name: string;
  };
}

interface Order {
  id: string;
  order_number: string;
  created_at: string;
  total_amount: number;
  subtotal: number;
  vat_amount: number;
  payment_status: string;
  payment_method: string;
  pos_session_id: string | null;
  order_items: {
    product_name: string;
    quantity: number;
    unit_price: number;
  }[];
}

interface Waiver {
  id: string;
  signed_at: string;
  participant_name: string;
  participant_email: string;
  participant_phone: string;
  signed_pdf_url: string | null;
  game_name: string;
  template_title: string;
  template_version: string;
  booking_id: string;
  bookings: {
    booking_number: string;
    booking_date: string;
  };
}

interface Invoice {
  id: string;
  invoice_number: string;
  booking_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  status: string;
  issued_at: string;
  due_date: string | null;
  paid_at: string | null;
  payment_method: string | null;
  booking_number: string | null;
  game_name: string | null;
  lobby_game_name: string | null;
  booking_type: string;
  amount_paid: number;
  refunded_amount: number;
  notes?: string;
}

type TabType = 'dashboard' | 'bookings' | 'lobby-bookings' | 'lobby-passes' | 'purchases' | 'video-requests' | 'contact-messages' | 'invoices' | 'waivers' | 'profile';

interface EnhancedCustomerPortalProps {
  onNavigate?: (page: string) => void;
}

const getAchievementStyleColor = (tag: string) => {
  const colors: Record<string, string> = {
    vikings: 'bg-blue-900/50 text-blue-300',
    pirates: 'bg-purple-900/50 text-purple-300',
    horror: 'bg-red-900/50 text-red-300',
    adventurer: 'bg-green-900/50 text-green-300',
    sinner: 'bg-pink-900/50 text-pink-300',
    achiever: 'bg-yellow-900/50 text-yellow-300',
    reacher: 'bg-cyan-900/50 text-cyan-300',
    struggler: 'bg-orange-900/50 text-orange-300',
    dracula: 'bg-red-900/70 text-red-200',
    gamer: 'bg-indigo-900/50 text-indigo-300',
    sleeper: 'bg-slate-800/50 text-slate-300',
    dangerous: 'bg-rose-900/50 text-rose-300',
    neutral: 'bg-slate-900/50 text-slate-300',
  };
  return colors[tag] || colors.neutral;
};

export default function EnhancedCustomerPortal({ onNavigate }: EnhancedCustomerPortalProps = {}) {
  const { user, profile, signOut, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [lobbyBookings, setLobbyBookings] = useState<LobbyBooking[]>([]);
  const [lobbyPasses, setLobbyPasses] = useState<LobbyPass[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [waivers, setWaivers] = useState<Waiver[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [videoRequests, setVideoRequests] = useState<any[]>([]);
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [selectedBooking] = useState<Booking | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchBookings(),
      fetchLobbyBookings(),
      fetchLobbyPasses(),
      fetchInvoices(),
      fetchVideoRequests(),
      fetchContactMessages(),
      fetchOrders(),
      fetchWaivers(),
    ]);
    setLoading(false);
  };

  const fetchBookings = async () => {
    if (!user?.id) return;
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        game:games(id, name, image_url)
      `)
      .eq('user_id', user.id)
      .is('lobby_game_id', null)
      .order('booking_date', { ascending: false });

    if (!bookingsError && bookingsData) {
      const bookingsWithWaiverStatus = await Promise.all(
        (bookingsData as Booking[]).map(async booking => {
          const { data: waiversData } = await supabase
            .from('waivers')
            .select('waiver_status, player_number')
            .eq('booking_id', booking.id);

          const signedCount = (waiversData as any[])?.filter((w: any) => w.waiver_status === 'signed').length || 0;
          const totalCount = booking.number_of_players || 0;

          let achievements: Achievement[] = [];
          if (booking.booking_status === 'completed') {
            const { data: achievementsData } = await supabase
              .from('booking_achievements')
              .select(`
                achievement_id,
                game_achievements (
                  id,
                  title,
                  short_description,
                  style_tag
                )
              `)
              .eq('booking_id', booking.id);

            achievements = (achievementsData as any[])?.map(ba => ba.game_achievements).filter(Boolean) || [];
          }

          return {
            ...(booking as Booking),
            has_waiver: signedCount > 0,
            waiver_signed_count: signedCount,
            waiver_total_count: totalCount,
            all_waivers_signed: signedCount === totalCount && totalCount > 0,
            achievements,
          };
        })
      );

      setBookings(bookingsWithWaiverStatus as unknown as Booking[]);
    }
  };

  const fetchLobbyBookings = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .rpc('get_customer_lobby_bookings', {
        p_user_id: user.id
      } as any);

    if (!error && data) {
      setLobbyBookings(data as any);
    } else if (error) {
      console.error('Error fetching lobby bookings:', error);
    }
  };

  const fetchLobbyPasses = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('lobby_game_passes')
      .select(`
        *,
        lobby_game:lobby_games(name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setLobbyPasses(data as any);
    }
  };

  const fetchOrders = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        created_at,
        total_amount,
        subtotal,
        vat_amount,
        payment_status,
        payment_method,
        pos_session_id,
        order_items(product_name, quantity, unit_price)
      `)
      .eq('user_id', user.id)
      .eq('order_type', 'merchandise')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data as any);
    }
  };

  const fetchWaivers = async () => {
    if (!user?.id) return;
    
    // Simplified query to ensure we get data even if relations are partial
    // Removed strict inner joins where possible or verified they are correct
    const { data, error } = await supabase
      .from('waivers')
      .select(`
        id,
        signed_at,
        participant_name,
        participant_email,
        participant_phone,
        game_name,
        template_title,
        template_version,
        booking_id,
        signed_pdf_url,
        waiver_status,
        bookings!inner(
          booking_number,
          booking_date,
          game_id,
          lobby_game_id
        )
      `)
      .eq('user_id', user.id)
      .eq('waiver_status', 'signed') // Only show signed waivers
      .is('bookings.lobby_game_id', null)
      .not('bookings.game_id', 'is', null)
      .order('signed_at', { ascending: false });

    if (!error && data) {
      setWaivers(data as any);
    } else if (error) {
      console.error('Error fetching waivers:', error);
    }
  };

  const fetchInvoices = async () => {
    if (!user?.email) return;
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        bookings!invoices_booking_id_fkey (
          booking_number,
          booking_type,
          game_id,
          lobby_game_id,
          games (name),
          lobby_games (name)
        )
      `)
      .eq('customer_email', user.email)
      .order('issued_at', { ascending: false });

    if (!error && data) {
      const invoicesWithDetails = data.map((invoice: any) => ({
        ...invoice,
        booking_number: invoice.bookings?.booking_number || null,
        booking_type: invoice.bookings?.booking_type || 'custom',
        game_name: invoice.bookings?.games?.name || null,
        lobby_game_name: invoice.bookings?.lobby_games?.name || null,
      }));
      setInvoices(invoicesWithDetails);
    } else if (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const fetchVideoRequests = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('video_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setVideoRequests(data as any[]);
    }
  };

  const fetchContactMessages = async () => {
    if (!user?.email) return;
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .eq('email', user.email)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setContactMessages(data as any[]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
      case 'completed':
      case 'paid':
      case 'active':
        return 'text-primary-400 bg-primary-900/20 border-primary-900/30';
      case 'pending':
        return 'text-red-400 bg-red-900/20 border-red-900/30';
      case 'cancelled':
      case 'rejected':
      case 'failed':
        return 'text-red-400 bg-red-900/30 border-red-900/40';
      default:
        return 'text-slate-400 bg-slate-900/20 border-slate-800/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
      case 'completed':
      case 'paid':
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'cancelled':
      case 'rejected':
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const calculateTimeRemaining = (expiresAt: string) => {
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - currentTime.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${hours}h ${minutes}m ${seconds}s`;
  };

  

  const handleWaiverSigned = () => {
    fetchBookings();
    fetchWaivers();
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== 'DELETE') return;

    setIsDeletingAccount(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account', {
        method: 'POST',
      });

      if (error) throw error;

      alert('Your account has been deleted.');
      await signOut();
      if (onNavigate) {
        onNavigate('home');
      } else {
        window.location.href = '/';
      }
    } catch (error: any) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please try again or contact support.');
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteModal(false);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-6 text-white border border-red-900/30 hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/20 transition-all">
          <Calendar className="w-8 h-8 mb-3 opacity-90" />
          <div className="text-3xl font-bold">{bookings.filter(b => b.booking_status === 'confirmed').length}</div>
          <div className="text-sm opacity-90">Upcoming Bookings</div>
        </div>

        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-6 text-white border border-red-900/30 hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/20 transition-all">
          <Trophy className="w-8 h-8 mb-3 opacity-90" />
          <div className="text-3xl font-bold">{lobbyPasses.filter(p => p.is_active).length}</div>
          <div className="text-sm opacity-90">Active Lobby Passes</div>
        </div>

        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-6 text-white border border-red-900/30 hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/20 transition-all">
          <Package className="w-8 h-8 mb-3 opacity-90" />
          <div className="text-3xl font-bold">{orders.length}</div>
          <div className="text-sm opacity-90">Total Orders</div>
        </div>
      </div>

      <div className="bg-black/50 rounded-xl shadow-lg p-6 border border-red-900/30 hover:border-primary-500/50 hover:shadow-primary-500/20 transition-all">
        <h3 className="text-lg font-semibold mb-4 text-white">Recent Activity</h3>
        {bookings.slice(0, 3).map((booking) => (
          <div key={booking.id} className="flex items-center gap-4 py-3 border-b border-red-900/30 last:border-0">
            <Calendar className="w-5 h-5 text-primary-500" />
            <div className="flex-1">
              <div className="font-medium text-white">{booking.game?.name || 'Booking'}</div>
              <div className="text-sm text-slate-400">
                {new Date(booking.booking_date).toLocaleDateString()} at {booking.start_time}
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(booking.booking_status)}`}>
              {booking.booking_status === 'rejected' ? 'Cancelled' : booking.booking_status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBookings = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">My Bookings</h2>

      {bookings.length === 0 ? (
        <div className="bg-black/50 rounded-xl shadow-lg p-12 text-center border border-red-900/30">
          <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No bookings yet</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-slate-900 rounded-xl shadow-lg overflow-hidden border border-red-900/30 hover:border-primary-500/50 hover:shadow-primary-500/20 transition-all">
              <div className="flex flex-col md:flex-row">
                {booking.game?.image_url && (
                  <div className="md:w-48 h-48 bg-black/50">
                    <img
                      src={booking.game.image_url}
                      alt={booking.game.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{booking.game?.name || 'Booking'}</h3>
                      <p className="text-sm text-slate-400">Booking #{booking.booking_number}</p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1 ${getStatusColor(booking.booking_status)}`}>
                        {getStatusIcon(booking.booking_status)}
                        {booking.booking_status === 'rejected' ? 'Cancelled' : booking.booking_status}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1 ${getStatusColor(booking.payment_status)}`}>
                        <CreditCard className="w-4 h-4" />
                        {booking.payment_status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-slate-400">Date</div>
                      <div className="font-medium text-white">{new Date(booking.booking_date).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Time</div>
                      <div className="font-medium text-white">{booking.start_time} - {booking.end_time}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Players</div>
                      <div className="font-medium text-white">{booking.number_of_players}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Amount</div>
                      <div className="font-medium text-primary-500">AED {booking.final_amount}</div>
                    </div>
                  </div>

                  {!booking.all_waivers_signed && (
                    <div className="mt-4 p-4 bg-red-900/20 border border-red-900/30 rounded-lg">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-red-300 mb-1">Waivers Required</p>
                            <p className="text-sm text-red-400 mb-2">
                              {booking.waiver_signed_count || 0} of {(booking.waiver_total_count ?? 0)} waivers signed.
                              {(booking.waiver_total_count ?? 0) > 1 && (
                                <> Each player must sign a waiver before the game.</>
                              )}
                              {(booking.waiver_total_count ?? 0) === 1 && (
                                <> You must sign a waiver before playing this escape room game.</>
                              )}
                            </p>
                            <p className="text-xs text-red-500">
                              <strong>Note:</strong> Additional players can sign waivers when they arrive at the venue, or you can ask staff for assistance.
                            </p>
                          </div>
                        </div>
                        {/* {booking.waiver_signed_count === 0 && (
                          <button
                            onClick={() => handleSignWaiver(booking)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors whitespace-nowrap"
                          >
                            <PenTool className="w-4 h-4" />
                            Sign Waiver
                          </button>
                        )} */}
                        {booking.waiver_signed_count === 0 && (
                          <div className="text-sm text-slate-400 italic">
                            Please sign waiver at the venue
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {booking.all_waivers_signed && (
                    <div className="mt-4 p-3 bg-primary-900/20 border border-primary-900/30 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-primary-400">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-medium">
                          All waivers signed ({booking.waiver_total_count ?? 0} of {booking.waiver_total_count ?? 0})
                        </span>
                      </div>
                    </div>
                  )}

                  {booking.booking_status === 'completed' && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-900/30 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Trophy className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-yellow-400 mb-2">Game Completed!</h4>
                          {booking.time_to_finish_minutes && (
                            <p className="text-sm text-slate-300 mb-3">
                              <Clock className="w-4 h-4 inline mr-1" />
                              Completed in <span className="font-semibold text-yellow-400">{booking.time_to_finish_minutes} minutes</span>
                            </p>
                          )}
                          {booking.achievements && booking.achievements.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-yellow-400 mb-2">Achievements Earned:</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {booking.achievements.map((achievement: any) => (
                                  <div
                                    key={achievement.id}
                                    className="flex items-start gap-2 p-2 bg-black/30 rounded border border-yellow-900/30"
                                  >
                                    <Trophy className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-yellow-300 text-sm truncate">
                                          {achievement.title}
                                        </span>
                                        {achievement.style_tag && (
                                          <span className={`px-1.5 py-0.5 text-xs rounded-full flex-shrink-0 ${getAchievementStyleColor(achievement.style_tag)}`}>
                                            {achievement.style_tag}
                                          </span>
                                        )}
                                      </div>
                                      {achievement.short_description && (
                                        <p className="text-xs text-slate-400 mt-0.5">
                                          {achievement.short_description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {booking.achievement_note && (
                            <div className="mt-3 p-2 bg-black/30 rounded border border-yellow-900/30">
                              <p className="text-sm text-slate-300 italic">
                                "{booking.achievement_note}"
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {booking.booking_status === 'pending' && (
                    <div className="mt-4 p-3 bg-red-900/20 border border-red-900/30 rounded-lg">
                      <p className="text-sm text-red-400">
                        <strong>Important:</strong> Please confirm your attendance at least 30 minutes before the game by calling or emailing us. Unconfirmed bookings may be released to other customers.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderLobbyBookings = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Lobby Game Bookings</h2>

      {lobbyBookings.length === 0 ? (
        <div className="bg-black/50 rounded-xl shadow-lg p-12 text-center border border-red-900/30">
          <Clock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No lobby bookings yet</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {lobbyBookings.map((booking) => (
            <div key={booking.id} className="bg-slate-900 rounded-xl shadow-lg overflow-hidden border border-red-900/30 hover:border-primary-500/50 hover:shadow-primary-500/20 transition-all">
              <div className="flex flex-col md:flex-row">
                {booking.lobby_game_image && (
                  <div className="md:w-48 h-48 bg-black/50">
                    <img
                      src={booking.lobby_game_image}
                      alt={booking.lobby_game_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{booking.lobby_game_name}</h3>
                      <p className="text-sm text-slate-400">Booking #{booking.booking_number}</p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1 ${getStatusColor(booking.booking_status)}`}>
                        {getStatusIcon(booking.booking_status)}
                        {booking.booking_status === 'rejected' ? 'Cancelled' : booking.booking_status}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1 ${getStatusColor(booking.payment_status)}`}>
                        <CreditCard className="w-4 h-4" />
                        {booking.payment_status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-slate-400">Date</div>
                      <div className="font-medium text-white">{new Date(booking.booking_date).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Time</div>
                      <div className="font-medium text-white">{booking.start_time} - {booking.end_time}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Duration</div>
                      <div className="font-medium text-white">{booking.duration_minutes} minutes</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Amount</div>
                      <div className="font-medium text-primary-500">AED {booking.final_amount}</div>
                    </div>
                  </div>

                  {booking.pass_code && (
                    <div className="mt-4 space-y-3">
                      <div className="p-4 bg-primary-900/20 border border-primary-900/30 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-primary-300">Lobby Pass Generated</div>
                            <div className="text-xs text-primary-400 mt-1">Pass Code: <span className="font-mono font-bold text-base">{booking.pass_code}</span></div>
                            <div className="text-xs text-primary-500 mt-1">
                              Status: <span className={`font-medium ${booking.pass_status === 'active' ? 'text-green-400' : booking.pass_status === 'pending' ? 'text-yellow-400' : 'text-red-400'}`}>
                                {booking.pass_status === 'pending' ? 'Awaiting Activation' : booking.pass_status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {booking.pass_is_active && booking.pass_expires_at && (
                        <div className="p-4 bg-gradient-to-r from-green-900/30 to-primary-900/30 border border-green-500/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Timer className="w-8 h-8 text-green-400 animate-pulse" />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-green-300">Time Remaining</div>
                              <div className="text-3xl font-bold text-green-400 tabular-nums">
                                {calculateTimeRemaining(booking.pass_expires_at)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {booking.booking_status === 'pending' && (
                    <div className="mt-4 p-3 bg-red-900/20 border border-red-900/30 rounded-lg">
                      <p className="text-sm text-red-400">
                        <strong>Note:</strong> Your lobby pass will be activated by staff when you arrive. Once activated, your countdown timer will begin.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderLobbyPasses = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Lobby Game Passes</h2>

      {lobbyPasses.length === 0 ? (
        <div className="bg-black/50 rounded-xl shadow-lg p-12 text-center border border-red-900/30">
          <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No lobby passes yet</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {lobbyPasses.map((pass) => (
            <div key={pass.id} className="bg-slate-900 rounded-xl shadow-lg p-6 border border-red-900/30 hover:border-primary-500/50 hover:shadow-primary-500/20 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{pass.lobby_game.name}</h3>
                  <p className="text-sm text-slate-400">Pass Code: {pass.pass_code}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1 ${getStatusColor(pass.status)}`}>
                  {getStatusIcon(pass.status)}
                  {pass.status}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-sm text-slate-400">Duration</div>
                  <div className="font-medium text-white">{pass.hours_purchased} hour(s)</div>
                </div>
                {pass.activated_at && (
                  <div>
                    <div className="text-sm text-slate-400">Started At</div>
                    <div className="font-medium text-white">{new Date(pass.activated_at).toLocaleString()}</div>
                  </div>
                )}
                {pass.expires_at && (
                  <div>
                    <div className="text-sm text-slate-400">Expires At</div>
                    <div className="font-medium text-white">{new Date(pass.expires_at).toLocaleString()}</div>
                  </div>
                )}
              </div>

              {pass.is_active && pass.expires_at && (
                <div className="bg-gradient-to-r from-green-900/30 to-primary-900/30 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Timer className="w-8 h-8 text-green-400 animate-pulse" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-green-300">Time Remaining</div>
                      <div className="text-3xl font-bold text-green-400 tabular-nums">
                        {calculateTimeRemaining(pass.expires_at)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderPurchases = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Merchandise Purchases</h2>
          <p className="text-slate-400 mt-1">All your merchandise orders from online store and in-store POS</p>
        </div>
        <div className="text-sm text-slate-300 bg-primary-900/20 px-4 py-2 rounded-lg border border-red-900/30">
          {orders.length} {orders.length === 1 ? 'order' : 'orders'}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-black/50 rounded-xl shadow-lg p-12 text-center border border-red-900/30">
          <ShoppingBag className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No purchases yet</h3>
          <p className="text-slate-400">Your merchandise orders will appear here</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-slate-900 rounded-xl shadow-lg overflow-hidden border border-red-900/30 hover:border-primary-500/50 hover:shadow-primary-500/20 transition-all">
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <ShoppingBag className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Order #{order.order_number}</h3>
                      <p className="text-sm text-red-100">
                        Order ID: {order.id.substring(0, 8)}...
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-red-100">Ordered</div>
                    <div className="text-sm font-semibold text-white">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1 ${getStatusColor(order.payment_status)}`}>
                    {getStatusIcon(order.payment_status)}
                    {order.payment_status}
                  </span>
                  {order.pos_session_id && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-900/20 text-primary-400 border border-primary-900/30">
                      In-Store Purchase
                    </span>
                  )}
                  {!order.pos_session_id && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-900/20 text-primary-400 border border-primary-900/30">
                      Online Order
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <div className="text-sm font-semibold text-slate-300 mb-2">Order Items</div>
                  <div className="space-y-2">
                    {order.order_items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b border-red-900/30 last:border-0">
                        <div className="flex-1">
                          <span className="text-white font-medium">{item.product_name}</span>
                          <span className="text-slate-400 text-sm ml-2">× {item.quantity}</span>
                        </div>
                        <span className="font-medium text-white">{formatPrice(item.unit_price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-red-900/30 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Subtotal</span>
                    <span className="font-medium text-white">{formatPrice(order.subtotal || 0)}</span>
                  </div>
                  {order.vat_amount && order.vat_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">VAT (5%)</span>
                      <span className="font-medium text-white">{formatPrice(order.vat_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-red-900/30">
                    <div>
                      <div className="text-sm text-slate-400 mb-1">Payment Method</div>
                      <span className="inline-flex items-center gap-1 text-sm font-medium capitalize px-2 py-1 bg-black/50 text-slate-300 rounded">
                        <CreditCard className="w-3 h-3" />
                        {order.payment_method || 'N/A'}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-400">Total Amount</div>
                      <div className="text-2xl font-bold text-primary-500">
                        {formatPrice(order.total_amount)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderWaivers = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Signed Waivers</h2>
          <p className="text-slate-400 mt-1">View your signed waivers for escape room bookings</p>
        </div>
        <div className="text-sm text-slate-300 bg-primary-900/20 px-4 py-2 rounded-lg border border-red-900/30">
          {waivers.length} {waivers.length === 1 ? 'waiver' : 'waivers'} signed
        </div>
      </div>

      {waivers.length === 0 ? (
        <div className="bg-black/50 rounded-xl shadow-lg p-12 text-center border border-red-900/30">
          <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No signed waivers yet</h3>
          <p className="text-slate-400">Waivers are signed when you book an escape room game</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {waivers.map((waiver) => (
            <div key={waiver.id} className="bg-slate-900 rounded-xl shadow-lg overflow-hidden border border-red-900/30 hover:border-primary-500/50 hover:shadow-primary-500/20 transition-all">
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{waiver.game_name}</h3>
                      <p className="text-sm text-red-100">
                        Booking #{waiver.bookings?.booking_number || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-red-100">Signed</div>
                    <div className="text-sm font-semibold text-white">
                      {new Date(waiver.signed_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Participant Name</div>
                    <div className="font-medium text-white">{waiver.participant_name}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Email</div>
                    <div className="font-medium text-white">{waiver.participant_email}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Phone</div>
                    <div className="font-medium text-white">{waiver.participant_phone || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Waiver Version</div>
                    <div className="font-medium text-white">{waiver.template_version || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Booking Date</div>
                    <div className="font-medium text-white">
                      {waiver.bookings?.booking_date
                        ? new Date(waiver.bookings.booking_date + 'T00:00:00').toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : 'N/A'
                      }
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Waiver Title</div>
                    <div className="font-medium text-white">{waiver.template_title || 'Standard Waiver'}</div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-red-900/30">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm text-primary-400 bg-primary-900/20 px-3 py-2 rounded-lg flex-1">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">Waiver signed and accepted for this escape room booking</span>
                    </div>
                    {waiver.signed_pdf_url && (
                      <button
                        onClick={async () => {
                          try {
                            const url = await getWaiverPdfUrl(waiver.signed_pdf_url!);
                            if (url) {
                              window.open(url, '_blank');
                            } else {
                              alert('Failed to load waiver PDF');
                            }
                          } catch (error) {
                            console.error('Error loading waiver PDF:', error);
                            alert('Failed to load waiver PDF');
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors text-sm font-medium"
                      >
                        <Download className="w-4 h-4" />
                        View PDF
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderInvoices = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Invoices</h2>
          <p className="text-slate-400 mt-1">View all your invoices for bookings and purchases</p>
        </div>
        <div className="text-sm text-slate-300 bg-primary-900/20 px-4 py-2 rounded-lg border border-red-900/30">
          {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'}
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-black/50 rounded-xl shadow-lg p-12 text-center border border-red-900/30">
          <CreditCard className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No invoices yet</h3>
          <p className="text-slate-400">Invoices are generated automatically when you make bookings or purchases</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="bg-slate-900 rounded-xl shadow-lg overflow-hidden border border-red-900/30 hover:border-primary-500/50 hover:shadow-primary-500/20 transition-all">
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white font-mono">{invoice.invoice_number}</h3>
                      {invoice.booking_number && (
                        <p className="text-sm text-red-100">
                          Booking #{invoice.booking_number}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-red-100">Issued</div>
                    <div className="text-sm font-semibold text-white">
                      {new Date(invoice.issued_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Service</div>
                    <div className="font-medium text-white">
                      {invoice.game_name && (
                        <div>
                          <div>{invoice.game_name}</div>
                          <div className="text-xs text-slate-400">Escape Room</div>
                        </div>
                      )}
                      {invoice.lobby_game_name && !invoice.game_name && (
                        <div>
                          <div>{invoice.lobby_game_name}</div>
                          <div className="text-xs text-slate-400">Lobby Game</div>
                        </div>
                      )}
                      {!invoice.game_name && !invoice.lobby_game_name && invoice.notes && invoice.notes.toLowerCase().includes('video order') && (
                        <div>
                          <div>Video Order</div>
                          <div className="text-xs text-slate-400">Video Service</div>
                        </div>
                      )}
                      {!invoice.game_name && !invoice.lobby_game_name && (!invoice.notes || !invoice.notes.toLowerCase().includes('video order')) && (
                        <div className="text-slate-400">Custom Invoice</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Status</div>
                    <div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        invoice.status === 'paid' ? 'bg-primary-900/20 text-primary-400 border border-primary-900/30' :
                        invoice.status === 'completed' ? 'bg-primary-900/20 text-primary-400 border border-primary-900/30' :
                        invoice.status === 'pending' ? 'bg-red-900/20 text-red-400 border border-red-900/30' :
                        invoice.status === 'partially_refunded' ? 'bg-orange-900/20 text-orange-400 border border-orange-900/30' :
                        invoice.status === 'refunded' ? 'bg-slate-800/50 text-slate-400 border border-slate-700' :
                        'bg-slate-900/20 text-slate-400 border border-slate-800/30'
                      }`}>
                        {invoice.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-red-900/30 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Subtotal:</span>
                    <span className="font-medium text-white">{formatPrice(invoice.subtotal)}</span>
                  </div>
                  {invoice.discount_amount > 0 && (
                    <div className="flex justify-between text-sm text-primary-400">
                      <span>Discount:</span>
                      <span className="font-medium">-{formatPrice(invoice.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">VAT (5%):</span>
                    <span className="font-medium text-white">{formatPrice(invoice.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-red-900/30">
                    <span className="text-white">Total:</span>
                    <span className="text-primary-500">{formatPrice(invoice.total_amount)}</span>
                  </div>

                  {(invoice.status === 'partially_refunded' || invoice.status === 'refunded' || (invoice.refunded_amount > 0)) && (
                    <div className="pt-2 border-t border-red-900/30 space-y-1">
                      <div className="flex justify-between text-sm text-slate-300">
                        <span>Amount Paid:</span>
                        <span>{formatPrice(invoice.amount_paid || invoice.total_amount)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-red-400">
                        <span>Refunded:</span>
                        <span>-{formatPrice(invoice.refunded_amount || 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold text-green-400 pt-1">
                        <span>Net Paid:</span>
                        <span>{formatPrice(Math.max(0, (invoice.amount_paid || invoice.total_amount) - (invoice.refunded_amount || 0)))}</span>
                      </div>
                    </div>
                  )}

                  {invoice.discount_amount > 0 && (
                    <div className="text-xs text-primary-400 text-right">
                      You saved {formatPrice(invoice.discount_amount)}!
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderVideoRequests = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Your Video Requests</h2>
          <p className="text-slate-400 mt-1">Review your video order requests</p>
        </div>
        <div className="text-sm text-slate-300 bg-primary-900/20 px-4 py-2 rounded-lg border border-red-900/30">
          {videoRequests.length} {videoRequests.length === 1 ? 'request' : 'requests'}
        </div>
      </div>

      {videoRequests.length === 0 ? (
        <div className="bg-black/50 rounded-xl shadow-lg p-12 text-center border border-red-900/30">
          <Video className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No video requests yet</h3>
          <p className="text-slate-400">Submit a video order to see it here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videoRequests.map((request) => (
            <div key={request.id} className="bg-slate-900 rounded-xl shadow-lg overflow-hidden border border-red-900/30 hover:border-primary-500/50 hover:shadow-primary-500/20 transition-all">
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="font-bold text-white font-mono text-lg">{(request.id || '').toString().slice(0, 8)}</div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                  request.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                  request.status === 'processing' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                  request.status === 'delivered' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                  'bg-red-500/20 text-red-400 border-red-500/30'
                }`}>
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </span>
              </div>
              <div className="px-6 pb-6 space-y-2 text-sm text-slate-300">
                <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-primary-900/20 text-primary-300 border border-primary-900/30">Video Order</div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="capitalize">{request.video_type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>{request.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  <span>AED {request.price}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(request.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderContactMessages = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Your Contact Messages</h2>
          <p className="text-slate-400 mt-1">Messages you submitted to us</p>
        </div>
        <div className="text-sm text-slate-300 bg-primary-900/20 px-4 py-2 rounded-lg border border-red-900/30">
          {contactMessages.length} {contactMessages.length === 1 ? 'message' : 'messages'}
        </div>
      </div>

      {contactMessages.length === 0 ? (
        <div className="bg-black/50 rounded-xl shadow-lg p-12 text-center border border-red-900/30">
          <Mail className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No messages yet</h3>
          <p className="text-slate-400">Use the contact form to send us a message</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contactMessages.map((msg) => (
            <div key={msg.id} className="bg-slate-900 rounded-xl shadow-lg overflow-hidden border border-red-900/30 hover:border-primary-500/50 hover:shadow-primary-500/20 transition-all">
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="font-bold text-white text-lg truncate max-w-[70%]">{msg.subject}</div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                  msg.status === 'new' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                  msg.status === 'resolved' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                  'bg-blue-500/20 text-blue-400 border-blue-500/30'
                }`}>
                  {String(msg.status || 'new').replace('_', ' ').replace('-', ' ')}
                </span>
              </div>
              <div className="px-6 pb-6 space-y-3 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>{msg.email}</span>
                </div>
                <div className="text-slate-300">{msg.message}</div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(msg.created_at).toLocaleDateString()}</span>
                </div>
                {msg.admin_reply && (
                  <div className="bg_black/30 border border-red-900/30 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">Admin Reply</div>
                    <div className="text-slate-200 text-sm">{msg.admin_reply}</div>
                  </div>
                )}
                {msg.admin_notes && (
                  <div className="bg-black/30 border border-red-900/30 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">Admin Notes</div>
                    <div className="text-slate-200 text-sm">{msg.admin_notes}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Profile & Security</h2>

      <div className="bg-slate-900 rounded-xl shadow-lg p-6 border border-red-900/30 hover:border-primary-500/50 hover:shadow-primary-500/20 transition-all">
        <h3 className="text-lg font-semibold mb-4 text-white">Personal Information</h3>
        {editingProfile ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
              <input
                type="text"
                value={profileData.full_name}
                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                className="w-full px-4 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                className="w-full px-4 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditingProfile(false)}
                className="px-4 py-2 border border-red-900/30 text-white rounded-lg hover:bg-black/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    if (!user) return;

                    const { error } = await updateProfile({
                      full_name: profileData.full_name,
                      phone: profileData.phone || null,
                    });

                    if (error) throw error;

                    setEditingProfile(false);
                    alert('Profile updated successfully!');
                  } catch (error: any) {
                    console.error('Error updating profile:', error);
                    alert('Failed to update profile. Please try again.');
                  }
                }}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-sm text-slate-400">Email</div>
              <div className="font-medium text-white">{profile?.email}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400">Name</div>
              <div className="font-medium text-white">{profile?.full_name}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400">Phone</div>
              <div className="font-medium text-white">{profile?.phone || 'Not provided'}</div>
            </div>
            <button
              onClick={() => setEditingProfile(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit Profile
            </button>
          </div>
        )}
      </div>

      <div className="bg-slate-900 rounded-xl shadow-lg p-6 border border-red-900/30 hover:border-primary-500/50 hover:shadow-primary-500/20 transition-all">
        <h3 className="text-lg font-semibold mb-4 text-white">Security</h3>
        <button
          onClick={() => setShowPasswordModal(true)}
          className="flex items-center gap-2 px-4 py-2 border border-red-900/30 text-white rounded-lg hover:bg-black/50 transition-colors"
        >
          <Lock className="w-4 h-4" />
          Change Password
        </button>
      </div>

      <div className="bg-slate-900 rounded-xl shadow-lg p-6 border border-red-900/30 hover:border-primary-500/50 hover:shadow-primary-500/20 transition-all">
        <h3 className="text-lg font-semibold mb-4 text-red-500">Danger Zone</h3>
        <div className="space-y-4">
          <div className="p-4 bg-red-900/10 border border-red-900/30 rounded-lg">
            <h4 className="font-medium text-red-400 mb-1">Account Deletion</h4>
            <p className="text-sm text-slate-400 mb-3">
              Your login access and personal identity will be removed.
              Your bookings, invoices, and waivers will remain stored for legal and operational purposes.
            </p>
            <button
              onClick={() => {
                setDeleteConfirmationText('');
                setShowDeleteModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-900/20 border border-red-900/50 text-red-400 rounded-lg hover:bg-red-900/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Delete my Account
            </button>
          </div>

          <div className="border-t border-red-900/30 pt-4">
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: User },
    { id: 'bookings' as TabType, label: 'Escape Rooms', icon: Calendar },
    { id: 'lobby-bookings' as TabType, label: 'Lobby Bookings', icon: Clock },
    { id: 'lobby-passes' as TabType, label: 'Lobby Passes', icon: Trophy },
    { id: 'purchases' as TabType, label: 'Purchases', icon: ShoppingBag },
    { id: 'video-requests' as TabType, label: 'Video Requests', icon: Video },
    { id: 'contact-messages' as TabType, label: 'Contact Messages', icon: Mail },
    { id: 'invoices' as TabType, label: 'Invoices', icon: CreditCard },
    { id: 'waivers' as TabType, label: 'Waivers', icon: FileText },
    { id: 'profile' as TabType, label: 'Profile', icon: User },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    }
  };

  return (
    <>
      <Navigation onNavigate={handleNavigate} />
      <div className="min-h-screen bg-black pt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-slate-900 rounded-xl shadow-lg p-6 mb-8 border border-red-900/30 hover:border-primary-500/50 hover:shadow-primary-500/20 transition-all">
          <h1 className="text-3xl font-bold mb-2 text-white">
            Welcome back, {profile?.full_name}!
          </h1>
          <p className="text-slate-400">Manage your bookings, passes, and account</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-64">
            <nav className="bg-slate-900 rounded-xl shadow-lg p-4 space-y-1 border border-red-900/30">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-500 text-white'
                        : 'text-slate-300 hover:bg-black/50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex-1">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'bookings' && renderBookings()}
            {activeTab === 'lobby-bookings' && renderLobbyBookings()}
            {activeTab === 'lobby-passes' && renderLobbyPasses()}
            {activeTab === 'purchases' && renderPurchases()}
            {activeTab === 'video-requests' && renderVideoRequests()}
            {activeTab === 'contact-messages' && renderContactMessages()}
            {activeTab === 'invoices' && renderInvoices()}
            {activeTab === 'waivers' && renderWaivers()}
            {activeTab === 'profile' && renderProfile()}
          </div>
        </div>
      </div>
      </div>
      <Footer onNavigate={handleNavigate} />

      {showWaiverModal && selectedBooking && user && profile && (
        <WaiverSigningModal
          booking={{
            id: selectedBooking.id,
            booking_number: selectedBooking.booking_number,
            booking_date: selectedBooking.booking_date,
            game: {
              id: selectedBooking.game.id,
              name: selectedBooking.game.name,
            },
          }}
          user={{
            id: user.id,
            email: profile.email,
            full_name: profile.full_name || '',
            phone: profile.phone ?? undefined,
          }}
          onClose={() => setShowWaiverModal(false)}
          onSuccess={handleWaiverSigned}
        />
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl shadow-2xl max-w-md w-full p-6 border border-red-900/30">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Change Password</h3>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({ newPassword: '', confirmPassword: '' });
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Confirm new password"
                />
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-sm text-blue-300">
                  Password must be at least 6 characters long.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({ newPassword: '', confirmPassword: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-red-900/30 text-white rounded-lg hover:bg-black/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      if (passwordData.newPassword !== passwordData.confirmPassword) {
                        alert('Passwords do not match');
                        return;
                      }

                      if (passwordData.newPassword.length < 6) {
                        alert('Password must be at least 6 characters long');
                        return;
                      }

                      const { error } = await supabase.auth.updateUser({
                        password: passwordData.newPassword,
                      });

                      if (error) throw error;

                      alert('Password updated successfully!');
                      setShowPasswordModal(false);
                      setPasswordData({ newPassword: '', confirmPassword: '' });
                    } catch (error: any) {
                      console.error('Error updating password:', error);
                      alert('Failed to update password. Please try again.');
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Update Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl shadow-2xl max-w-md w-full p-6 border border-red-500/50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-red-500 flex items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                Delete Account
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
                disabled={isDeletingAccount}
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-red-900/20 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-200 font-medium">
                  Warning: This action is permanent and cannot be undone.
                </p>
                <ul className="list-disc list-inside text-sm text-slate-300 mt-2 space-y-1">
                  <li>You will lose access to your account immediately.</li>
                  <li>Your personal profile data will be deleted or anonymized.</li>
                  <li>Past bookings and waivers will be kept for legal records.</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Type <span className="font-mono font-bold text-white">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  className="w-full px-4 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="DELETE"
                  disabled={isDeletingAccount}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
                  disabled={isDeletingAccount}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmationText !== 'DELETE' || isDeletingAccount}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeletingAccount ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" />
                      Delete Account
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
