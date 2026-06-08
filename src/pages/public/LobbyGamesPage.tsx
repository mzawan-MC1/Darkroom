import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/currencyUtils';
import { Gamepad2, Clock, DollarSign, Users, Ticket, CheckCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import SEOHead from '../../components/SEOHead';

interface LobbyGamesPageProps {
  onNavigate: (page: string) => void;
}

interface LobbyGame {
  id: string;
  name: string;
  description: string | null;
  hourly_price: number;
  image_url: string | null;
  is_available: boolean;
  max_players: number | null;
}

import { BookingStatus, OrderType, PaymentStatus } from '../../lib/database.types';

interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  valid_from: string;
  valid_until: string | null;
  usage_limit: number | null;
  usage_count: number;
  is_active: boolean;
  applicable_to: string[] | null;
  min_purchase_amount: number | null;
  max_discount_amount: number | null;
}

export default function LobbyGamesPage({ onNavigate }: LobbyGamesPageProps) {
  const { user, profile } = useAuth();
  const [games, setGames] = useState<LobbyGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState<LobbyGame | null>(null);
  const [bookingData, setBookingData] = useState({
    hours: 1,
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    referral_source: '',
  });
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeData, setPromoCodeData] = useState<PromoCode | null>(null);
  const [promoCodeError, setPromoCodeError] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [useBillingAddress, setUseBillingAddress] = useState(true);
  const [billingDetails, setBillingDetails] = useState({
    name: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    emirate: '',
    country: 'UAE',
    postal_code: '',
    vat_number: '',
  });
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPaymentSettings();
  }, []);

  const fetchPaymentSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('public_payment_settings')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      console.log("Payment Settings:", data);

      if (!error && data) {
        setPaymentSettings(data);
      }
    } catch (err) {
      console.error('Error fetching payment settings:', err);
    }
  };

  useEffect(() => {
    if (useBillingAddress) {
      setBillingDetails(prev => ({
        ...prev,
        name: bookingData.customer_name
      }));
    }
  }, [useBillingAddress, bookingData.customer_name]);

  // Suppress warning about unused onNavigate until we implement navigation within this page
  useEffect(() => {
    if (false) onNavigate('home'); 
  }, [onNavigate]);

  useEffect(() => {
    fetchGames();
  }, []);

  useEffect(() => {
    if (user && profile) {
      setBookingData(prev => ({
        ...prev,
        customer_name: profile.full_name || '',
        customer_email: user.email || '',
        customer_phone: profile.phone || '',
      }));
    }
  }, [user, profile]);

  const fetchGames = async () => {
    try {
      const { data, error } = await supabase
        .from('lobby_games')
        .select('*')
        .eq('is_available', true)
        .order('name');

      if (error) throw error;
      setGames((data as LobbyGame[]) || []);
    } catch (error) {
      console.error('Error fetching lobby games:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyPromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoCodeError('Please enter a promo code');
      return;
    }

    if (!selectedGame) return;

    setApplyingPromo(true);
    setPromoCodeError('');

    try {
      const { data: promoData, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      
      const data = promoData as any;

      if (!data) {
        setPromoCodeError('Invalid promo code');
        setPromoCodeData(null);
        return;
      }

      const now = new Date();
      const validFrom = new Date(data.valid_from);
      const validUntil = data.valid_until ? new Date(data.valid_until) : null;

      if (now < validFrom) {
        setPromoCodeError('This promo code is not yet valid');
        setPromoCodeData(null);
        return;
      }

      if (validUntil && now > validUntil) {
        setPromoCodeError('This promo code has expired');
        setPromoCodeData(null);
        return;
      }

      if (data.usage_limit && data.usage_count >= data.usage_limit) {
        setPromoCodeError('This promo code has reached its usage limit');
        setPromoCodeData(null);
        return;
      }

      if (!data.applicable_to || !data.applicable_to.includes('booking')) {
        setPromoCodeError('This promo code is not applicable to lobby game bookings');
        setPromoCodeData(null);
        return;
      }

      const subtotal = selectedGame.hourly_price * bookingData.hours;

      if (data.min_purchase_amount && subtotal < data.min_purchase_amount) {
        setPromoCodeError(`Minimum purchase amount is ${formatPrice(data.min_purchase_amount)}`);
        setPromoCodeData(null);
        return;
      }

      setPromoCodeData(data as PromoCode);
      setPromoCodeError('');
    } catch (error) {
      console.error('Error applying promo code:', error);
      setPromoCodeError('Error validating promo code');
      setPromoCodeData(null);
    } finally {
      setApplyingPromo(false);
    }
  };

  const removePromoCode = () => {
    setPromoCode('');
    setPromoCodeData(null);
    setPromoCodeError('');
  };

  const calculatePricing = () => {
    if (!selectedGame) return { subtotal: 0, vat: 0, discount: 0, total: 0 };

    const subtotal = selectedGame.hourly_price * bookingData.hours;
    let discount = 0;

    if (promoCodeData) {
      if (promoCodeData.discount_type === 'percentage') {
        discount = subtotal * (promoCodeData.discount_value / 100);
        if (promoCodeData.max_discount_amount) {
          discount = Math.min(discount, promoCodeData.max_discount_amount);
        }
      } else if (promoCodeData.discount_type === 'fixed') {
        discount = promoCodeData.discount_value;
      }
      discount = Math.min(discount, subtotal);
    }

    const subtotalAfterDiscount = subtotal - discount;
    const vat = subtotalAfterDiscount * 0.05;
    const total = subtotalAfterDiscount + vat;

    return { subtotal, vat, discount, total };
  };

  const handleBooking = (game: LobbyGame) => {
    setSelectedGame(game);
    if (user && profile) {
      setBookingData(prev => ({
        ...prev,
        customer_name: profile.full_name || '',
        customer_email: user.email || '',
      }));
    }
    setShowBookingModal(true);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!selectedGame) {
      setIsSubmitting(false);
      return;
    }

    if (!termsAccepted) {
      alert('Please accept the Terms and Conditions to proceed');
      setIsSubmitting(false);
      return;
    }

    if (!privacyAccepted) {
      alert('Please accept the Privacy Policy to proceed');
      setIsSubmitting(false);
      return;
    }

    try {
      const pricing = calculatePricing();
      const now = new Date();
      const bookingDate = now.toISOString().split('T')[0];
      const startTime = now.toTimeString().split(' ')[0];
      const endTime = new Date(now.getTime() + bookingData.hours * 60 * 60 * 1000).toTimeString().split(' ')[0];

      // Prepare billing address
      let billingAddressData = null;
      const hasBillingData = billingDetails.address_line_1 || billingDetails.city || billingDetails.emirate || billingDetails.vat_number;
      
      if (hasBillingData) {
        if (!billingDetails.address_line_1) {
          throw new Error('Billing Address Line 1 is required when entering billing details');
        }
        billingAddressData = billingDetails;
      }

      const bookingDataForRpc = {
        user_id: user?.id || null,
        lobby_game_id: selectedGame.id,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        number_of_players: 1,
        customer_name: bookingData.customer_name,
        customer_email: bookingData.customer_email,
        customer_phone: bookingData.customer_phone,
        referral_source: bookingData.referral_source || null,
        booking_status: 'confirmed' as BookingStatus,
        payment_status: 'pending' as PaymentStatus,
        subtotal: pricing.subtotal,
        vat_amount: pricing.vat,
        total_amount: pricing.subtotal + pricing.vat,
        discount_amount: pricing.discount,
        final_amount: pricing.total,
        promo_code_id: (promoCodeData?.id as string) || null,
        billing_address: billingAddressData,
      };

      const orderDataForRpc = {
        order_type: 'lobby_game' as OrderType,
        user_id: user?.id || null,
        customer_name: bookingData.customer_name,
        customer_email: bookingData.customer_email,
        subtotal: pricing.subtotal,
        vat_amount: pricing.vat,
        total_amount: pricing.subtotal + pricing.vat,
        discount_amount: pricing.discount,
        final_amount: pricing.total,
        payment_status: 'pending' as PaymentStatus,
        promo_code_id: (promoCodeData?.id as string) || null,
      };

      const { data: booking, error: bookingError } = await supabase.rpc('create_booking_flow', {
        p_booking_data: bookingDataForRpc,
        p_order_data: orderDataForRpc,
        p_participants: [],
        p_waiver_data: null
      } as any);

      if (bookingError) throw bookingError;

      const newBooking = booking as any;

      // If payment is active, we MUST initiate payment.
      // We first create a PENDING booking to reserve the slot and get an ID for the payment provider.
      if (paymentSettings) {
        await handlePaymentRedirect(newBooking.id, pricing.total, 'AED', bookingData);
      } else {
        // If no payment provider is active, we complete the booking directly.
        alert(`Success! Your lobby game booking has been created.\nA pass will be generated automatically and sent to your email.`);
        setShowBookingModal(false);
        setSelectedGame(null);
        setBookingData(prev => ({ ...prev, hours: 1, customer_name: '', customer_email: '', referral_source: '' }));
        setPromoCode('');
        setPromoCodeData(null);
        setPromoCodeError('');
      }
    } catch (error: any) {
      console.error('Error creating booking:', error);
      alert(error.message || 'Error creating booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentRedirect = async (bookingId: string, amount: number, currency: string, formData: any) => {
    try {
      const { data: sessionData, error: sessionError } = await supabase.functions.invoke(
        'create-payment-session',
        {
          body: {
            type: 'booking',
            itemId: bookingId,
            amount,
            currency,
            metadata: {
              email: formData.customer_email,
              firstName: formData.customer_name.split(' ')[0] || '',
              lastName: formData.customer_name.split(' ').slice(1).join(' ') || '',
              phone: formData.customer_phone,
              billing_city: billingDetails.city,
              billing_state: billingDetails.emirate,
              billing_postal: billingDetails.postal_code,
              billing_address_line_1: billingDetails.address_line_1,
              billing_address_line_2: billingDetails.address_line_2,
              is_lobby_game: true,
              origin: window.location.origin
            },
          },
        }
      );

      if (sessionError) {
        console.error('Edge Function Error Context:', sessionError);
        throw sessionError;
      }

      if (!sessionData.success) {
        throw new Error(sessionData.error || 'Failed to create payment session');
      }

      console.log('Payment session created:', sessionData);

      if (sessionData.provider === 'mpgs_adib0' || sessionData.provider === 'mpgs') {
        await loadMPGSScript(sessionData.sessionId, sessionData.merchantId, sessionData.orderId);
      } else if (sessionData.checkoutUrl) {
        window.location.href = sessionData.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      alert(`Payment initiation failed: ${err.message}`);
      setIsSubmitting(false);
    }
  };

  const loadMPGSScript = (sessionId: string, merchantId: string, orderId: string) => {
    return new Promise<void>((resolve, reject) => {
      const scriptUrl = 'https://eu-gateway.mastercard.com/static/checkout/checkout.min.js';
      
      // Define callbacks globally so the script can find them
      (window as any).errorCallback = (error: any) => {
        console.error('MPGS Error:', error);
        reject(new Error(JSON.stringify(error)));
      };

      (window as any).cancelCallback = () => {
        console.log('MPGS Payment Cancelled');
        reject(new Error('Payment cancelled'));
      };

      (window as any).completeCallback = (resultIndicator: string, sessionVersion: string) => {
          console.log('MPGS Payment Complete:', resultIndicator, sessionVersion);
          resolve();
      }

      const configure = () => {
        try {
          if (!(window as any).Checkout) {
             reject(new Error('MPGS Checkout library not found'));
             return;
          }

          console.log('Configuring MPGS Checkout with:', { sessionId, merchantId, orderId });

          (window as any).Checkout.configure({
            session: {
              id: sessionId
            }
          });
          
          console.log('Showing Payment Page');
          (window as any).Checkout.showPaymentPage();
          // resolve() is called when payment is complete, or we can resolve here if we don't wait? 
          // Actually, showPaymentPage() might be async or callback based. 
          // The hosted checkout redirects or opens a modal. 
          // If it redirects, this promise never resolves in this context.
          // If it's a lightbox (which hosted checkout often is), we might need to wait.
          // However, typical MPGS Hosted Checkout redirects the page or replaces content.
          // Let's assume it handles the flow.
          resolve(); 
        } catch (err) {
          console.error('MPGS Configuration Error:', err);
          reject(err);
        }
      };

      if (document.querySelector(`script[src="${scriptUrl}"]`)) {
        configure();
      } else {
        const script = document.createElement('script');
        script.src = scriptUrl;
        script.dataset.error = 'errorCallback';
        script.dataset.cancel = 'cancelCallback';
        script.dataset.complete = 'completeCallback'; // Assuming this is how we hook into completion if it stays on page
        script.onload = configure;
        script.onerror = () => reject(new Error('Failed to load MPGS checkout script'));
        document.body.appendChild(script);
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-24 pb-12">
      <SEOHead
        pageIdentifier="lobby-games"
        fallbackTitle="Lobby Games - Escape Room"
        fallbackDescription="Enjoy our exciting lobby games while waiting for your escape room session. Fun for all ages."
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Lobby Games</h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Enjoy our collection of exciting lobby games. Book by the hour and play as long as you want!
          </p>
        </div>

        <div className="bg-black/50 border border-red-900/30 rounded-2xl p-8 text-white mb-12 hover:border-primary-500/50 hover:shadow-xl hover:shadow-primary-500/20 transition-all">
          <h2 className="text-2xl font-bold mb-4">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold mb-1">Choose Your Game</h3>
                <p className="text-sm text-slate-400">Select from our collection and book your preferred hours</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold mb-1">Get Your Pass</h3>
                <p className="text-sm text-slate-400">Receive a unique pass code for your booking</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-1">Start Playing</h3>
                <p className="text-sm text-slate-400">Show your pass code to our staff and enjoy your game time</p>
              </div>
            </div>
          </div>
        </div>

        {games.length === 0 ? (
          <div className="bg-slate-900 border border-red-900/30 rounded-xl p-12 text-center">
            <Gamepad2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-xl text-slate-400">No lobby games available at the moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {games.map((game) => (
              <div key={game.id} className="bg-slate-900 border border-red-900/30 rounded-2xl overflow-hidden hover:border-primary-500/50 hover:shadow-xl hover:shadow-primary-500/20 transition-all">
                <div className="h-56 bg-gradient-to-br from-slate-800 to-black relative">
                  {game.image_url ? (
                    <img src={game.image_url} alt={game.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Gamepad2 className="w-20 h-20 text-slate-700" />
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-white mb-3">{game.name}</h3>
                  <p className="text-slate-400 mb-4 line-clamp-3">
                    {game.description || 'Enjoy this exciting game in our lobby area'}
                  </p>
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-slate-400">
                      <DollarSign className="w-5 h-5 text-primary-500" />
                      <span className="text-lg font-semibold">{formatPrice(game.hourly_price)}/hour</span>
                    </div>
                    {game.max_players && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Users className="w-5 h-5 text-primary-500" />
                        <span>Up to {game.max_players} players</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleBooking(game)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-colors"
                  >
                    <Ticket className="w-5 h-5" />
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showBookingModal && selectedGame && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-red-900/30 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-red-900/30">
              <h2 className="text-2xl font-bold text-white">Book {selectedGame.name}</h2>
            </div>

            <form onSubmit={handleSubmitBooking} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Number of Hours
                </label>
                <select
                  value={bookingData.hours}
                  onChange={(e) => setBookingData(prev => ({ ...prev, hours: parseInt(e.target.value) }))}
                  className="w-full px-4 py-3 bg-black/50 border border-red-900/30 text-white rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                >
                  {[1, 2, 3, 4, 5, 6].map(h => (
                    <option key={h} value={h}>
                      {h} {h === 1 ? 'hour' : 'hours'} - {formatPrice(selectedGame.hourly_price * h)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  value={bookingData.customer_name}
                  onChange={(e) => setBookingData(prev => ({ ...prev, customer_name: e.target.value }))}
                  className="w-full px-4 py-3 bg-black/50 border border-red-900/30 text-white rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={bookingData.customer_email}
                  onChange={(e) => setBookingData(prev => ({ ...prev, customer_email: e.target.value }))}
                  className="w-full px-4 py-3 bg-black/50 border border-red-900/30 text-white rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-500"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={bookingData.customer_phone}
                  onChange={(e) => setBookingData(prev => ({ ...prev, customer_phone: e.target.value }))}
                  className="w-full px-4 py-3 bg-black/50 border border-red-900/30 text-white rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-500"
                  placeholder="+971 50 123 4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Where did you hear about us? (Optional)
                </label>
                <select
                  value={bookingData.referral_source}
                  onChange={(e) => setBookingData(prev => ({ ...prev, referral_source: e.target.value }))}
                  className="w-full px-4 py-3 bg-black/50 border border-red-900/30 text-white rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Promo Code (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    disabled={!!promoCodeData}
                    className="flex-1 px-4 py-3 bg-black/50 border border-red-900/30 text-white rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 uppercase disabled:bg-slate-800 placeholder-slate-500"
                    placeholder="Enter promo code"
                  />
                  {promoCodeData ? (
                    <button
                      type="button"
                      onClick={removePromoCode}
                      className="px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-colors"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={applyPromoCode}
                      disabled={applyingPromo || !promoCode.trim()}
                      className="px-4 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-slate-700 text-white rounded-xl font-semibold transition-colors"
                    >
                      {applyingPromo ? 'Applying...' : 'Apply'}
                    </button>
                  )}
                </div>
                {promoCodeError && (
                  <p className="text-sm text-primary-500 mt-1">{promoCodeError}</p>
                )}
                {promoCodeData && (
                  <p className="text-sm text-primary-500 mt-1">
                    Promo code applied: {promoCodeData.discount_type === 'percentage' ? `${promoCodeData.discount_value}% OFF` : `${formatPrice(promoCodeData.discount_value)} OFF`}
                  </p>
                )}
              </div>

              <div className="border-t border-red-900/30 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Billing Details</h3>
                
                <label className="flex items-center gap-2 mb-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useBillingAddress}
                    onChange={(e) => setUseBillingAddress(e.target.checked)}
                    className="rounded border-red-900/30 bg-black/50 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-300">Same as customer name</span>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!useBillingAddress && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-white mb-2">
                        Billing Name
                      </label>
                      <input
                        type="text"
                        value={billingDetails.name}
                        onChange={(e) => setBillingDetails({ ...billingDetails, name: e.target.value })}
                        className="w-full px-4 py-3 bg-black/50 border border-red-900/30 text-white rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-white mb-2">
                      Address Line 1
                    </label>
                    <input
                      type="text"
                      value={billingDetails.address_line_1}
                      onChange={(e) => setBillingDetails({ ...billingDetails, address_line_1: e.target.value })}
                      className="w-full px-4 py-3 bg-black/50 border border-red-900/30 text-white rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-500"
                      placeholder="Building, Street, Area"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-white mb-2">
                      Address Line 2 (Optional)
                    </label>
                    <input
                      type="text"
                      value={billingDetails.address_line_2}
                      onChange={(e) => setBillingDetails({ ...billingDetails, address_line_2: e.target.value })}
                      className="w-full px-4 py-3 bg-black/50 border border-red-900/30 text-white rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-500"
                      placeholder="Apartment, Suite, Unit, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={billingDetails.city}
                      onChange={(e) => setBillingDetails({ ...billingDetails, city: e.target.value })}
                      className="w-full px-4 py-3 bg-black/50 border border-red-900/30 text-white rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Emirate / State
                    </label>
                    <select
                      value={billingDetails.emirate}
                      onChange={(e) => setBillingDetails({ ...billingDetails, emirate: e.target.value })}
                      className="w-full px-4 py-3 bg-black/50 border border-red-900/30 text-white rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select Emirate</option>
                      <option value="Dubai">Dubai</option>
                      <option value="Abu Dhabi">Abu Dhabi</option>
                      <option value="Sharjah">Sharjah</option>
                      <option value="Ajman">Ajman</option>
                      <option value="Ras Al Khaimah">Ras Al Khaimah</option>
                      <option value="Fujairah">Fujairah</option>
                      <option value="Umm Al Quwain">Umm Al Quwain</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Country
                    </label>
                    <select
                      value={billingDetails.country}
                      onChange={(e) => setBillingDetails({ ...billingDetails, country: e.target.value })}
                      className="w-full px-4 py-3 bg-black/50 border border-red-900/30 text-white rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="UAE">United Arab Emirates</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Postal Code (Optional)
                    </label>
                    <input
                      type="text"
                      value={billingDetails.postal_code}
                      onChange={(e) => setBillingDetails({ ...billingDetails, postal_code: e.target.value })}
                      className="w-full px-4 py-3 bg-black/50 border border-red-900/30 text-white rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-white mb-2">
                      TRN / VAT Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={billingDetails.vat_number}
                      onChange={(e) => setBillingDetails({ ...billingDetails, vat_number: e.target.value })}
                      className="w-full px-4 py-3 bg-black/50 border border-red-900/30 text-white rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-500"
                      placeholder="For business customers"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-black/50 border border-red-900/30 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-400">Duration:</span>
                  <span className="font-semibold text-white">
                    {bookingData.hours} {bookingData.hours === 1 ? 'hour' : 'hours'}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-400">Rate:</span>
                  <span className="font-semibold text-white">{formatPrice(selectedGame.hourly_price)}/hour</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-400">Subtotal:</span>
                  <span className="font-semibold text-white">{formatPrice(calculatePricing().subtotal)}</span>
                </div>
                {promoCodeData && calculatePricing().discount > 0 && (
                  <div className="flex justify-between items-center mb-2 text-primary-500">
                    <span>Discount:</span>
                    <span className="font-semibold">-{formatPrice(calculatePricing().discount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-400">VAT (5%):</span>
                  <span className="font-semibold text-white">{formatPrice(calculatePricing().vat)}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold pt-2 border-t border-red-900/30">
                  <span className="text-white">Total:</span>
                  <span className="text-primary-500">
                    {formatPrice(calculatePricing().total)}
                  </span>
                </div>
              </div>

              <div className="bg-black/50 border border-primary-500/30 rounded-xl p-4">
                <div className="flex gap-3">
                  <CheckCircle className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-2">Important: Attendance Confirmation Required</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      You must confirm your attendance <strong className="text-white">at least 30 minutes before</strong> you plan to arrive by calling us, sending an email, or contacting us through WhatsApp.
                      <span className="block mt-2 font-medium text-white">
                        If we don't receive your confirmation, your booking may be released to other customers.
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-black/50 border border-primary-500/30 rounded-xl p-4">
                <p className="text-sm text-slate-400">
                  <Clock className="w-4 h-4 inline mr-1 text-primary-500" />
                  Your pass will be activated when you arrive at our location. The timer starts when our staff scans your pass code.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 cursor-pointer"
                    required
                  />
                  <span className="text-sm text-slate-300">
                    I accept the{' '}
                    <a
                      href="/page/terms-and-conditions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-500 hover:text-primary-400 underline font-medium inline-flex items-center gap-1"
                    >
                      Terms and Conditions
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </span>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    className="mt-1 cursor-pointer"
                    required
                  />
                  <span className="text-sm text-slate-300">
                    I accept the{' '}
                    <a
                      href="/privacy-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-500 hover:text-primary-400 underline font-medium inline-flex items-center gap-1"
                    >
                      Privacy Policy
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </span>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowBookingModal(false);
                    setSelectedGame(null);
                  }}
                  className="flex-1 py-3 border border-red-900/30 text-white rounded-xl hover:bg-black/50 hover:border-primary-500/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!termsAccepted || !privacyAccepted || isSubmitting}
                  className="flex-1 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {paymentSettings && paymentSettings.is_active && (paymentSettings.provider === 'mpgs' || paymentSettings.provider === 'mpgs_adib0') ? 'Processing Payment...' : 'Processing...'}
                    </>
                  ) : (
                    paymentSettings && paymentSettings.is_active && (paymentSettings.provider === 'mpgs' || paymentSettings.provider === 'mpgs_adib0') ? 'Proceed to Payment' : 'Confirm Booking'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
