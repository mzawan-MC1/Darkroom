import { useState, useEffect } from 'react';
import { X, Calendar, Clock, CheckCircle, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatPrice } from '../lib/currencyUtils';
import { sendWaiverSignedEmail } from '../lib/emailService';
import { sendBookingReceivedEmail, sendAdminBookingNotification } from '../lib/bookingEmailService';
import { BookingStatus, PaymentStatus } from '../lib/database.types';

interface CustomerBookingModalProps {
  game: any;
  onClose: () => void;
  onBookingCreated: () => void;
}

interface BookingSlot {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  max_participants: number;
  current_participants: number;
  is_available: boolean;
}

export default function CustomerBookingModal({
  game,
  onClose,
  onBookingCreated
}: CustomerBookingModalProps) {
  const { user, profile } = useAuth();
  const [availableSlots, setAvailableSlots] = useState<BookingSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [formData, setFormData] = useState({
    customer_name: profile?.full_name || '',
    customer_email: profile?.email || '',
    customer_phone: '',
    number_of_players: 2,
    special_requests: '',
    referral_source: '',
    difficulty_level: 'Normal',
  });
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [waiverTemplate, setWaiverTemplate] = useState<any>(null);
  const [pricing, setPricing] = useState({
    base_price: 0,
    discount_percentage: 0,
    discount_amount: 0,
    subtotal: 0,
    vat_amount: 0,
    final_price: 0,
  });
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeData, setPromoCodeData] = useState<any>(null);
  const [promoCodeError, setPromoCodeError] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
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
      // Use the public view to avoid RLS issues and only fetch safe fields
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
        name: formData.customer_name
      }));
    }
  }, [useBillingAddress, formData.customer_name]);

  useEffect(() => {
    fetchAvailableSlots();
    fetchActiveWaiver();
  }, [game.id]);

  useEffect(() => {
    calculatePricing();
  }, [formData.number_of_players, game.id, promoCodeData]);

  const fetchActiveWaiver = async () => {
    try {
      const { data, error } = await supabase
        .from('waiver_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setWaiverTemplate(data);
    } catch (error) {
      console.error('Error fetching waiver:', error);
    }
  };

  const calculatePricing = async () => {
    try {
      const { data, error } = await supabase.rpc('calculate_booking_price', {
        p_game_id: game.id,
        p_num_participants: formData.number_of_players,
      } as any);

      if (error) throw error;

      if (data && Array.isArray(data) && (data as any[]).length > 0) {
        const pricingData = (data as any[])[0];
        const basePricing = {
          base_price: parseFloat(String(pricingData.base_price)),
          discount_percentage: parseFloat(String(pricingData.discount_percentage)),
          discount_amount: parseFloat(String(pricingData.discount_amount)),
          subtotal: parseFloat(String(pricingData.subtotal)),
          vat_amount: parseFloat(String(pricingData.vat_amount)),
          final_price: parseFloat(String(pricingData.final_price)),
        };

        let additionalDiscount = 0;
        if (promoCodeData) {
          if (promoCodeData.discount_type === 'percentage') {
            additionalDiscount = basePricing.subtotal * (parseFloat(promoCodeData.discount_value) / 100);
            if (promoCodeData.max_discount_amount) {
              additionalDiscount = Math.min(additionalDiscount, parseFloat(promoCodeData.max_discount_amount));
            }
          } else if (promoCodeData.discount_type === 'fixed') {
            additionalDiscount = parseFloat(promoCodeData.discount_value);
          }
          additionalDiscount = Math.min(additionalDiscount, basePricing.subtotal);
        }

        setPromoDiscount(additionalDiscount);

        const newSubtotal = basePricing.subtotal - additionalDiscount;
        const newVat = newSubtotal * 0.05;
        const newFinalPrice = newSubtotal + newVat;

        setPricing({
          ...basePricing,
          subtotal: basePricing.subtotal,
          vat_amount: newVat,
          final_price: newFinalPrice,
        });
      }
    } catch (error) {
      console.error('Error calculating pricing:', error);
    }
  };

  const applyPromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoCodeError('Please enter a promo code');
      return;
    }

    setApplyingPromo(true);
    setPromoCodeError('');

    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setPromoCodeError('Invalid promo code');
        setPromoCodeData(null);
        return;
      }

      const promoData = data as any;
      const now = new Date();
      const validFrom = new Date(promoData.valid_from || '');
      const validUntil = promoData.valid_until ? new Date(promoData.valid_until) : null;

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

      if (promoData.usage_limit && (promoData.usage_count || 0) >= promoData.usage_limit) {
        setPromoCodeError('This promo code has reached its usage limit');
        setPromoCodeData(null);
        return;
      }

      const applicableTo = promoData.applicable_to as string[] | null;
      if (!applicableTo || !applicableTo.includes('booking')) {
        setPromoCodeError('This promo code is not applicable to escape room bookings');
        setPromoCodeData(null);
        return;
      }

      if (promoData.min_purchase_amount && pricing.subtotal < parseFloat(String(promoData.min_purchase_amount))) {
        setPromoCodeError(`Minimum purchase amount is ${formatPrice(parseFloat(String(promoData.min_purchase_amount)))}`);
        setPromoCodeData(null);
        return;
      }

      setPromoCodeData(promoData);
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
    setPromoDiscount(0);
  };

  const fetchAvailableSlots = async () => {
    try {
      setLoadingSlots(true);
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('booking_slots')
        .select(`
          *,
          game_schedules!inner(game_id)
        `)
        .eq('game_schedules.game_id', game.id)
        .eq('is_available', true)
        .eq('current_participants', 0)
        .gte('slot_date', today)
        .order('slot_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching slots:', error);
        throw error;
      }

      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const todayStr = now.toISOString().split('T')[0];

      const oneHourFromNow = currentTime + 15;

      const filteredSlots: any[] = (data || []).filter((slot: any) => {
        if (slot.slot_date > todayStr) {
          return true;
        }

        if (slot.slot_date === todayStr) {
          const [hours, minutes] = slot.start_time.split(':').map(Number);
          const slotTimeInMinutes = hours * 60 + minutes;

          return slotTimeInMinutes >= oneHourFromNow;
        }

        return false;
      });

      console.log('Available slots after time filter:', filteredSlots.length);
      setAvailableSlots(filteredSlots);

      const uniqueDates = Array.from(new Set(filteredSlots.map((slot: any) => slot.slot_date)));
      setAvailableDates(uniqueDates as string[]);

      if (uniqueDates.length > 0 && !selectedDate) {
        setSelectedDate(uniqueDates[0]);
      }
    } catch (error: any) {
      console.error('Error fetching slots:', error);
      alert(`Failed to load time slots: ${error.message || 'Unknown error'}`);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!waiverAccepted) {
      alert('Please accept the waiver to proceed');
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

    setLoading(true);
    let waiverUpdated = false;

    try {
      if (!selectedSlot) {
        throw new Error('Please select a time slot');
      }

      const slot = availableSlots.find(s => s.id === selectedSlot);
      if (!slot) {
        throw new Error('Invalid slot selected');
      }

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const oneHourFromNow = currentTime + 15;

      if (slot.slot_date === todayStr) {
        const [hours, minutes] = slot.start_time.split(':').map(Number);
        const slotTimeInMinutes = hours * 60 + minutes;

        if (slotTimeInMinutes < oneHourFromNow) {
          throw new Error('This time slot is no longer available. Please select a slot at least 15 minutes from now.');
        }
      }

      const totalDiscount = pricing.discount_amount + promoDiscount;

      // Prepare billing address
      let billingAddressData = null;
      const hasBillingData = billingDetails.address_line_1 || billingDetails.city || billingDetails.emirate || billingDetails.vat_number;
      
      if (hasBillingData) {
        if (!billingDetails.address_line_1) {
          throw new Error('Billing Address Line 1 is required when entering billing details');
        }
        billingAddressData = billingDetails;
      }

      const bookingData = {
        user_id: user?.id || null,
        game_id: game.id,
        booking_slot_id: selectedSlot,
        booking_date: slot.slot_date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        number_of_players: formData.number_of_players,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        special_requests: formData.special_requests || null,
        referral_source: formData.referral_source || null,
        booking_status: 'pending' as BookingStatus,
        payment_status: 'pending' as PaymentStatus,
        subtotal: pricing.subtotal,
        vat_amount: pricing.vat_amount,
        total_amount: pricing.subtotal + pricing.vat_amount,
        discount_amount: totalDiscount,
        final_amount: pricing.final_price,
        booking_type_id: '6a9e9640-9036-429f-9eec-a95dc12d8e25',
        promo_code_id: (promoCodeData?.id as string) || null,
        difficulty_level: formData.difficulty_level,
        billing_address: billingAddressData,
      };

      const participantsData = [{
        full_name: formData.customer_name,
        phone_number: formData.customer_phone,
        email: formData.customer_email,
        age: 18,
        is_waiver_signed: true
      }];

      let waiverData = null;
      if (waiverTemplate && waiverAccepted) {
        waiverData = {
          user_id: user?.id || null,
          waiver_template_id: waiverTemplate.id,
          participant_name: formData.customer_name,
          participant_email: formData.customer_email,
          participant_phone: formData.customer_phone,
          participant_age: 18,
          waiver_status: 'signed',
          signed_at: new Date().toISOString(),
          ip_address: '127.0.0.1',
          user_agent: navigator.userAgent,
          signature_data: formData.customer_name
        };
      }

      const { data: booking, error: bookingError } = await supabase.rpc('create_booking_flow', {
        p_booking_data: bookingData,
        p_participants: participantsData,
        p_waiver_data: waiverData || undefined
      } as any);

      if (bookingError) throw bookingError;

      const newBooking = booking as any;

      // Ensure we flag waiver as updated if we sent data and got no error
      if (waiverData) {
        waiverUpdated = true;
      }

      // Construct billing address string for email
      let billingAddressStr = '';
      if (hasBillingData) {
        const parts = [
          useBillingAddress ? null : billingDetails.name,
          billingDetails.address_line_1,
          billingDetails.address_line_2,
          billingDetails.city,
          billingDetails.emirate,
          billingDetails.country,
          billingDetails.postal_code ? `PO Box: ${billingDetails.postal_code}` : null,
          billingDetails.vat_number ? `TRN: ${billingDetails.vat_number}` : null
        ];
        billingAddressStr = parts.filter(Boolean).join(', ');
      }

      // Fire and forget email notifications to speed up UI response
      Promise.all([
        sendBookingReceivedEmail({
          bookingId: newBooking.id,
          customerName: formData.customer_name,
          customerEmail: formData.customer_email,
          gameName: game.name,
          bookingDate: new Date(slot.slot_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          bookingTime: slot.start_time,
          playerCount: formData.number_of_players,
          totalAmount: `AED ${pricing.final_price}`,
          bookingNumber: newBooking.booking_number,
          billingAddress: billingAddressStr,
        }).catch(err => console.error('Failed to send booking email:', err)),

        sendAdminBookingNotification('booking_received', {
          bookingId: newBooking.id,
          customerName: formData.customer_name,
          customerEmail: formData.customer_email,
          gameName: game.name,
          bookingDate: new Date(slot.slot_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          bookingTime: slot.start_time,
          playerCount: formData.number_of_players,
          totalAmount: `AED ${pricing.final_price}`,
          bookingNumber: newBooking.booking_number,
          billingAddress: billingAddressStr,
        }).catch(err => console.error('Failed to send admin notification:', err)),

        waiverUpdated ? sendWaiverSignedEmail(
          formData.customer_email,
          formData.customer_name,
          game.name,
          newBooking.booking_number || 'N/A',
          new Date(slot.slot_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        ).catch(err => console.error('Failed to send waiver email:', err)) : Promise.resolve()
      ]);

      // If payment is active, we MUST initiate payment.
      // We first create a PENDING booking to reserve the slot and get an ID for the payment provider.
      if (paymentSettings) {
        await handlePaymentRedirect(newBooking.id, pricing.final_price, newBooking.payment_currency || 'AED', formData);
      } else {
        // If no payment provider is active, we complete the booking directly.
        alert('Booking created successfully!');
        onBookingCreated();
        onClose();
      }
    } catch (error: any) {
      console.error('Error creating booking:', error);
      alert(error.message || 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
      setLoading(false);
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
      setLoading(false);
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
        script.dataset.complete = 'completeCallback'; 
        script.onload = configure;
        script.onerror = () => reject(new Error('Failed to load MPGS checkout script'));
        document.body.appendChild(script);
      }
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getSlotsForSelectedDate = () => {
    return availableSlots.filter(slot => slot.slot_date === selectedDate);
  };

  const filteredSlots = getSlotsForSelectedDate();

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-950/75 border border-red-900/30 rounded-2xl shadow-panel max-w-3xl w-full max-h-[90vh] overflow-y-auto backdrop-blur-md">
        <div className="sticky top-0 bg-slate-950/80 border-b border-red-900/30 px-6 py-4 flex items-center justify-between backdrop-blur-md">
          <div>
            <h2 className="text-xl font-semibold text-white">Book: {game.name}</h2>
            <p className="text-sm text-slate-400">AED {game.base_price} per player</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {loadingSlots ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-slate-400 text-sm">Loading available slots...</p>
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-sm">No available time slots. Please check back later or contact us.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-3">
                  Step 1: Select Date
                </label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-2 border border-red-900/30 rounded-xl bg-black/20">
                  {availableDates.map(date => (
                    <button
                      key={date}
                      type="button"
                      onClick={() => {
                        setSelectedDate(date);
                        setSelectedSlot('');
                      }}
                      className={`p-3 border rounded-xl text-center transition-colors ${
                        selectedDate === date
                          ? 'border-primary-500/70 bg-primary-500/10 text-slate-100 shadow-red-glow'
                          : 'border-red-900/25 hover:border-primary-500/40 text-slate-300 hover:bg-black/30'
                      }`}
                    >
                      <div className="text-xs font-medium">
                        {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="text-lg font-bold mt-1">
                        {new Date(date + 'T00:00:00').getDate()}
                      </div>
                      <div className="text-xs text-slate-400">
                        {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedDate && (
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-3">
                    Step 2: Select Time ({formatDate(selectedDate)})
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {filteredSlots.map(slot => (
                      <label
                        key={slot.id}
                        className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-colors bg-black/15 ${
                          selectedSlot === slot.id
                            ? 'border-primary-500/70 bg-primary-500/10 shadow-red-glow'
                            : 'border-red-900/25 hover:border-primary-500/40 hover:bg-black/25'
                        }`}
                      >
                        <input
                          type="radio"
                          name="slot"
                          value={slot.id}
                          checked={selectedSlot === slot.id}
                          onChange={(e) => setSelectedSlot(e.target.value)}
                          className="sr-only"
                          required
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm text-slate-100">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {formatTime(slot.start_time)}
                          </div>
                          <div className="text-xs text-slate-400">
                            {slot.max_participants - slot.current_participants} spots left
                          </div>
                        </div>
                        {selectedSlot === slot.id && (
                          <CheckCircle className="w-5 h-5 text-primary-500" />
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {availableSlots.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="dr-input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                    className="dr-input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    className="dr-input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    Number of Players
                  </label>
                  <input
                    type="number"
                    value={formData.number_of_players}
                    onChange={(e) => setFormData({ ...formData, number_of_players: parseInt(e.target.value) })}
                    className="dr-input"
                    min="1"
                    max={game.max_players}
                    required
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Min: {game.min_players}, Max: {game.max_players}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    Difficulty Level
                  </label>
                  <select
                    value={formData.difficulty_level}
                    onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}
                    className="dr-select"
                    required
                  >
                    <option value="Normal">Normal</option>
                    <option value="Hard">Hard</option>
                    <option value="Nightmare">Nightmare</option>
                  </select>
                  <p className="text-xs text-slate-400 mt-1">
                    Choose your challenge level
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Special Requests (Optional)
                </label>
                <textarea
                  value={formData.special_requests}
                  onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
                  rows={3}
                  className="dr-textarea"
                  placeholder="Any special requirements or requests..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Where did you hear about us? (Optional)
                </label>
                <select
                  value={formData.referral_source}
                  onChange={(e) => setFormData({ ...formData, referral_source: e.target.value })}
                  className="dr-select"
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
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Promo Code (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    disabled={!!promoCodeData}
                    className="flex-1 dr-input uppercase disabled:opacity-60"
                    placeholder="Enter promo code"
                  />
                  {promoCodeData ? (
                    <button
                      type="button"
                      onClick={removePromoCode}
                      className="dr-btn-danger"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={applyPromoCode}
                      disabled={applyingPromo || !promoCode.trim()}
                      className="dr-btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {applyingPromo ? 'Applying...' : 'Apply'}
                    </button>
                  )}
                </div>
                {promoCodeError && (
                  <p className="text-sm text-primary-300 mt-1">{promoCodeError}</p>
                )}
                {promoCodeData && (
                  <p className="text-sm text-emerald-300 mt-1">
                    Promo code applied: {promoCodeData.discount_type === 'percentage' ? `${promoCodeData.discount_value}% OFF` : `${formatPrice(promoCodeData.discount_value)} OFF`}
                  </p>
                )}
              </div>

              <div className="border-t border-red-900/30 pt-4">
                <h3 className="text-lg font-semibold text-white mb-4">Billing Details</h3>
                
                <label className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    checked={useBillingAddress}
                    onChange={(e) => setUseBillingAddress(e.target.checked)}
                    className="rounded border-red-900/40 bg-black/30 text-primary-500 focus:ring-primary-500/30"
                  />
                  <span className="text-sm text-slate-200">Same as customer name</span>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!useBillingAddress && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-200 mb-1">
                        Billing Name
                      </label>
                      <input
                        type="text"
                        value={billingDetails.name}
                        onChange={(e) => setBillingDetails({ ...billingDetails, name: e.target.value })}
                        className="dr-input"
                      />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                      Address Line 1
                    </label>
                    <input
                      type="text"
                      value={billingDetails.address_line_1}
                      onChange={(e) => setBillingDetails({ ...billingDetails, address_line_1: e.target.value })}
                      className="dr-input"
                      placeholder="Building, Street, Area"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                      Address Line 2 (Optional)
                    </label>
                    <input
                      type="text"
                      value={billingDetails.address_line_2}
                      onChange={(e) => setBillingDetails({ ...billingDetails, address_line_2: e.target.value })}
                      className="dr-input"
                      placeholder="Apartment, Suite, Unit, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={billingDetails.city}
                      onChange={(e) => setBillingDetails({ ...billingDetails, city: e.target.value })}
                      className="dr-input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                      Emirate / State
                    </label>
                    <select
                      value={billingDetails.emirate}
                      onChange={(e) => setBillingDetails({ ...billingDetails, emirate: e.target.value })}
                      className="dr-select"
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
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                      Country
                    </label>
                    <select
                      value={billingDetails.country}
                      onChange={(e) => setBillingDetails({ ...billingDetails, country: e.target.value })}
                      className="dr-select"
                    >
                      <option value="UAE">United Arab Emirates</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                      Postal Code (Optional)
                    </label>
                    <input
                      type="text"
                      value={billingDetails.postal_code}
                      onChange={(e) => setBillingDetails({ ...billingDetails, postal_code: e.target.value })}
                      className="dr-input"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                      TRN / VAT Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={billingDetails.vat_number}
                      onChange={(e) => setBillingDetails({ ...billingDetails, vat_number: e.target.value })}
                      className="dr-input"
                      placeholder="For business customers"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4">
                <div className="flex gap-3">
                  <CheckCircle className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-200 mb-2">Important: Attendance Confirmation Required</h4>
                    <p className="text-sm text-amber-100/90 leading-relaxed">
                      You must confirm your attendance <strong>at least 30 minutes before</strong> your scheduled game time by calling us, sending an email, or contacting us through WhatsApp.
                      <span className="block mt-2 font-medium">
                        If we don't receive your confirmation, your booking may be released to other customers.
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={waiverAccepted}
                    onChange={(e) => setWaiverAccepted(e.target.checked)}
                    className="mt-1 cursor-pointer rounded border-red-900/40 bg-black/30 text-primary-500 focus:ring-primary-500/30"
                    required
                  />
                  <span className="text-sm text-slate-200">
                    I accept the{' '}
                    <a
                      href="/page/waiver-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-500 hover:text-primary-600 underline font-medium inline-flex items-center gap-1"
                    >
                      waiver
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    {' '}and confirm that all participants meet the age and health requirements for this escape room experience.
                  </span>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 cursor-pointer rounded border-red-900/40 bg-black/30 text-primary-500 focus:ring-primary-500/30"
                    required
                  />
                  <span className="text-sm text-slate-200">
                    I accept the{' '}
                    <a
                      href="/page/terms-and-conditions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-500 hover:text-primary-600 underline font-medium inline-flex items-center gap-1"
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
                    className="mt-1 cursor-pointer rounded border-red-900/40 bg-black/30 text-primary-500 focus:ring-primary-500/30"
                    required
                  />
                  <span className="text-sm text-slate-200">
                    I accept the{' '}
                    <a
                      href="/privacy-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-500 hover:text-primary-600 underline font-medium inline-flex items-center gap-1"
                    >
                      Privacy Policy
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </span>
                </label>
              </div>

              <div className="bg-black/25 p-4 rounded-xl border border-red-900/30">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300">Players:</span>
                  <span className="font-semibold text-slate-100">{formData.number_of_players}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300">Price per player:</span>
                  <span className="font-semibold text-slate-100">AED {game.base_price}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300">Base Price:</span>
                  <span className="font-semibold text-slate-100">{formatPrice(pricing.base_price)}</span>
                </div>
                {pricing.discount_percentage > 0 && (
                  <div className="flex justify-between items-center mb-2 text-emerald-300">
                    <span className="flex items-center gap-1">
                      <span className="text-sm">Group Discount ({pricing.discount_percentage}%):</span>
                    </span>
                    <span className="font-semibold">-{formatPrice(pricing.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300">Subtotal:</span>
                  <span className="font-semibold text-slate-100">{formatPrice(pricing.subtotal)}</span>
                </div>
                {promoCodeData && promoDiscount > 0 && (
                  <div className="flex justify-between items-center mb-2 text-emerald-300">
                    <span className="text-sm">Promo Code Discount:</span>
                    <span className="font-semibold">-{formatPrice(promoDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300">VAT (5%):</span>
                  <span className="font-semibold text-slate-100">{formatPrice(pricing.vat_amount)}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold pt-2 border-t border-red-900/30">
                  <span className="text-slate-100">Total Amount:</span>
                  <span className="text-primary-500">{formatPrice(pricing.final_price)}</span>
                </div>
                {(pricing.discount_percentage > 0 || promoDiscount > 0) && (
                  <p className="text-xs text-emerald-300 mt-2 text-center">
                    You saved {formatPrice(pricing.discount_amount + promoDiscount)} in total!
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 dr-btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !selectedSlot || !waiverAccepted || !termsAccepted || !privacyAccepted || isSubmitting}
                  className="flex-1 dr-btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            </>
          )}
        </form>
      </div>

    </div>
  );
}
