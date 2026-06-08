import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Video, Clock, Mail, Phone, MessageCircle, Calendar, CreditCard, CheckCircle } from 'lucide-react';
import SEOHead from '../../components/SEOHead';

interface OrderVideoPageProps {
  onNavigate: (page: string) => void;
}

interface VideoRequest {
  id: string;
  user_id: string | null;
  booking_id: string | null;
  booking_reference?: string | null;
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
  invoice_id?: string | null;
  notes: string | null;
  admin_notes: string | null;
  status: 'pending' | 'processing' | 'ready' | 'delivered' | 'cancelled' | 'rejected';
  created_at: string;
}

interface SiteSettings {
  video_order_hero_title: string;
  video_order_hero_subtitle: string;
  video_order_hero_background: string;
  video_order_pricing_1hour: number;
  video_order_pricing_2hour: number;
  video_order_pricing_3hour: number;
  video_order_duration_1_minutes: number;
  video_order_duration_2_minutes: number;
  video_order_duration_3_minutes: number;
  video_order_duration_1hour?: number;
  video_order_duration_2hour?: number;
  video_order_duration_3hour?: number;
  video_order_delivery_email: boolean;
  video_order_delivery_link: boolean;
  video_order_contact_phone: string;
  video_order_contact_whatsapp: string;
  video_order_terms_text: string;
}

export default function OrderVideoPage({}: OrderVideoPageProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [userRequests, setUserRequests] = useState<VideoRequest[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    booking_reference: '',
    video_type: '1hour' as '1hour' | '2hour' | '3hour',
    customer_name: profile?.full_name || '',
    customer_email: user?.email || '',
    customer_phone: profile?.phone || '',
    game_name: '',
    played_date: '',
    played_time: '',
    delivery_method: 'email' as 'email' | 'whatsapp',
    special_instructions: '',
    agree_to_terms: false,
  });

  useEffect(() => {
    loadSettings();
    if (user) {
      loadUserRequests();
    }
  }, [user, profile]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'video_order_hero_title',
          'video_order_hero_subtitle',
          'video_order_hero_background',
          'video_order_pricing_1hour',
          'video_order_pricing_2hour',
          'video_order_pricing_3hour',
          'video_order_duration_1_minutes',
          'video_order_duration_2_minutes',
          'video_order_duration_3_minutes',
          'video_order_delivery_email',
          'video_order_delivery_link',
          'video_order_contact_phone',
          'video_order_contact_whatsapp',
          'video_order_terms_text',
        ]);

      if (error) throw error;

      const settingsObj: any = {};
      data?.forEach((item: any) => {
        const key = item.setting_key;
        const value = item.setting_value;
        if (key.includes('pricing_') || key.includes('delivery_') || key.includes('show_')) {
          settingsObj[key] = typeof value === 'boolean' ? value : (typeof value === 'string' ? (value === 'true' || value === '1') : value);
        } else {
          settingsObj[key] = value;
        }
      });

      setSettings({
        video_order_hero_title: settingsObj.video_order_hero_title || 'Order Your Game Video',
        video_order_hero_subtitle: settingsObj.video_order_hero_subtitle || 'Relive your escape room experience with professional video footage',
        video_order_hero_background: settingsObj.video_order_hero_background || '',
        video_order_pricing_1hour: parseFloat(settingsObj.video_order_pricing_1hour) || 150,
        video_order_pricing_2hour: parseFloat(settingsObj.video_order_pricing_2hour) || 250,
        video_order_pricing_3hour: parseFloat(settingsObj.video_order_pricing_3hour) || 350,
        video_order_duration_1_minutes: parseFloat(settingsObj.video_order_duration_1_minutes) || (
          settingsObj.video_order_duration_1hour ? parseFloat(settingsObj.video_order_duration_1hour) * 60 : 60
        ),
        video_order_duration_2_minutes: parseFloat(settingsObj.video_order_duration_2_minutes) || (
          settingsObj.video_order_duration_2hour ? parseFloat(settingsObj.video_order_duration_2hour) * 60 : 120
        ),
        video_order_duration_3_minutes: parseFloat(settingsObj.video_order_duration_3_minutes) || (
          settingsObj.video_order_duration_3hour ? parseFloat(settingsObj.video_order_duration_3hour) * 60 : 180
        ),
        video_order_delivery_email: settingsObj.video_order_delivery_email !== false,
        video_order_delivery_link: settingsObj.video_order_delivery_link !== false,
        video_order_contact_phone: settingsObj.video_order_contact_phone || '',
        video_order_contact_whatsapp: settingsObj.video_order_contact_whatsapp || '',
        video_order_terms_text: settingsObj.video_order_terms_text || '',
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('video_requests')
        .select('*')
        .eq('user_id', user?.id || '')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserRequests(data || []);
    } catch (error) {
      console.error('Error loading user requests:', error);
    }
  };

  const calculatePrice = (videoType: string) => {
    if (!settings) return 0;
    switch (videoType) {
      case '1hour': return settings.video_order_pricing_1hour;
      case '2hour': return settings.video_order_pricing_2hour;
      case '3hour': return settings.video_order_pricing_3hour;
      default: return 0;
    }
  };

  const mapVideoTypeForInsert = (videoType: '1hour' | '2hour' | '3hour') => {
    const minutes = videoType === '1hour'
      ? (settings?.video_order_duration_1_minutes || 60)
      : videoType === '2hour'
        ? (settings?.video_order_duration_2_minutes || 120)
        : (settings?.video_order_duration_3_minutes || 180);
    return minutes <= 90 ? 'short' : 'long';
  };

  const getDuration = (videoType: '1hour' | '2hour' | '3hour') => {
    if (!settings) return 0;
    switch (videoType) {
      case '1hour': return settings.video_order_duration_1_minutes ?? (settings.video_order_duration_1hour ? settings.video_order_duration_1hour * 60 : 60);
      case '2hour': return settings.video_order_duration_2_minutes ?? (settings.video_order_duration_2hour ? settings.video_order_duration_2hour * 60 : 120);
      case '3hour': return settings.video_order_duration_3_minutes ?? (settings.video_order_duration_3hour ? settings.video_order_duration_3hour * 60 : 180);
      default: return 0;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agree_to_terms) {
      alert('Please agree to the terms and conditions');
      return;
    }

    setSaving(true);
    try {
      const price = calculatePrice(formData.video_type);
      const insertVideoType = mapVideoTypeForInsert(formData.video_type);
      const deliveryMethod = formData.delivery_method === 'email' ? 'email' : 'whatsapp';
      const videoTypeDetail = insertVideoType === 'short' ? 'short_video' : 'full_video';
      const visitAt =
        formData.played_date && formData.played_time
          ? new Date(`${formData.played_date}T${formData.played_time}`).toISOString()
          : null;

      const { error } = await supabase
        .from('video_requests')
        .insert([{
          user_id: user?.id || null,
          booking_id: null,
          booking_reference: formData.booking_reference || null,
          full_name: formData.customer_name,
          email: formData.customer_email,
          phone: formData.customer_phone,
          game_name: formData.game_name,
          played_date: formData.played_date || null,
          played_time: formData.played_time || null,
          video_type: insertVideoType,
          video_type_detail: videoTypeDetail,
          price: price,
          delivery_method: deliveryMethod,
          request_method: 'online',
          payment_status: 'unpaid',
          visit_at: visitAt,
          notes: formData.special_instructions || null,
          status: 'pending',
        }] as any);

      if (error) throw error;

      setSubmitted(true);
      if (user) {
        loadUserRequests();
      }
      setTimeout(() => {
        setSubmitted(false);
        setFormData({
          booking_reference: '',
          video_type: '1hour',
          customer_name: profile?.full_name || '',
          customer_email: user?.email || '',
          customer_phone: profile?.phone || '',
          game_name: '',
          played_date: '',
          played_time: '',
          delivery_method: 'email',
          special_instructions: '',
          agree_to_terms: false,
        });
      }, 5000);
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'processing': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'ready': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'delivered': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal-950 bg-horror-radial pt-24 pb-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 shadow-red-glow"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-charcoal-950 bg-horror-radial pt-24 pb-12 flex items-center justify-center">
        <p className="text-slate-200">This page is being prepared. Please check back soon.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal-950 bg-horror-radial pt-24 pb-12">
      <SEOHead
        pageIdentifier="order-video"
        fallbackTitle="Order Game Video - Escape Room"
        fallbackDescription="Order professional video footage of your escape room experience."
      />
      
      {/* Hero Section */}
      <div 
        className="relative h-96 flex items-center justify-center text-center mb-12"
        style={{
          backgroundImage: settings.video_order_hero_background ? `url(${settings.video_order_hero_background})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="absolute inset-0 opacity-[0.12] bg-horror-grain" style={{ backgroundSize: '4px 4px' }}></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4">
          <p className="text-primary-300 text-xs tracking-[0.35em] uppercase font-semibold mb-4">
            Relive the Night
          </p>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 font-display tracking-wide">
            {settings.video_order_hero_title}
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto">
            {settings.video_order_hero_subtitle}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* User Requests Section (for logged-in users) */}
        {user && userRequests.length > 0 && (
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center font-display tracking-wide">Your Video Requests</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userRequests.map((request) => (
                <div key={request.id} className="dr-card p-6 hover:border-primary-500/60 hover:shadow-red-glow transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white font-display tracking-wide">{request.game_name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-slate-400">
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
          </div>
        )}

        {/* Order Form Section */}
        <div className="max-w-4xl mx-auto">
          <div className="dr-panel p-8 md:p-12 hover:border-primary-500/60 hover:shadow-red-glow transition-all">
            {submitted ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-4 font-display tracking-wide">Request Submitted!</h2>
                <p className="text-slate-300 text-lg mb-8">
                  Thank you for your video request. We'll process it and get back to you soon.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="dr-btn-primary px-6 py-3"
                >
                  Submit Another Request
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-4 font-display tracking-wide">
                    {user ? 'Order Your Game Video' : 'Request Game Video'}
                  </h2>
                  <p className="text-slate-300">
                    {user ? 'Order professional video footage of your escape room experience.' : 'Request professional video footage of your escape room experience.'}
                  </p>
                </div>

                {/* Booking Reference */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Booking Reference (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.booking_reference}
                    onChange={(e) => setFormData({ ...formData, booking_reference: e.target.value })}
                    className="dr-input px-4 py-3"
                    placeholder="Enter your booking reference number"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    You can find this in your booking confirmation email
                  </p>
                </div>

                {/* Game Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Game / Room Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.game_name}
                    onChange={(e) => setFormData({ ...formData, game_name: e.target.value })}
                    className="dr-input px-4 py-3"
                    placeholder="e.g., The Ritual Chamber"
                  />
                </div>

                {/* Video Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Video Duration
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(['1hour', '2hour', '3hour'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({ ...formData, video_type: type })}
                        className={`p-4 rounded-2xl border transition-all dr-card ${
                          formData.video_type === type
                            ? 'border-primary-500/70 bg-primary-500/10 text-primary-200 shadow-red-glow'
                            : 'border-red-900/25 text-slate-300 hover:border-primary-500/40 hover:bg-black/30'
                        }`}
                      >
                        <Clock className="w-6 h-6 mx-auto mb-2" />
                        <div className="font-semibold">{getDuration(type)} Minutes</div>
                        <div className="text-sm">AED {calculatePrice(type)}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      className="dr-input px-4 py-3"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.customer_email}
                      onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                      className="dr-input px-4 py-3"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    className="dr-input px-4 py-3"
                    placeholder="+971 XX XXX XXXX"
                  />
                </div>

                {/* Delivery Method */}
                {(settings.video_order_delivery_email || settings.video_order_delivery_link) && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                      Delivery Method
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {settings.video_order_delivery_email && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, delivery_method: 'email' })}
                          className={`p-4 rounded-2xl border transition-all dr-card ${
                            formData.delivery_method === 'email'
                              ? 'border-primary-500/70 bg-primary-500/10 text-primary-200 shadow-red-glow'
                              : 'border-red-900/25 text-slate-300 hover:border-primary-500/40 hover:bg-black/30'
                          }`}
                        >
                          <Mail className="w-6 h-6 mx-auto mb-2" />
                          <div className="font-semibold">Email</div>
                          <div className="text-sm">Sent to your email</div>
                        </button>
                      )}
                      {settings.video_order_delivery_link && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, delivery_method: 'whatsapp' })}
                          className={`p-4 rounded-2xl border transition-all dr-card ${
                            formData.delivery_method === 'whatsapp'
                              ? 'border-primary-500/70 bg-primary-500/10 text-primary-200 shadow-red-glow'
                              : 'border-red-900/25 text-slate-300 hover:border-primary-500/40 hover:bg-black/30'
                          }`}
                        >
                          <MessageCircle className="w-6 h-6 mx-auto mb-2" />
                          <div className="font-semibold">WhatsApp</div>
                          <div className="text-sm">Receive via WhatsApp</div>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Special Instructions */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Special Instructions (Optional)
                  </label>
                  <textarea
                    rows={4}
                    value={formData.special_instructions}
                    onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                    className="dr-textarea px-4 py-3"
                    placeholder="Any specific requirements or notes..."
                  />
                </div>

                {/* Terms and Conditions */}
                {settings.video_order_terms_text && (
                  <div>
                    <div className="dr-card rounded-xl p-4 mb-4 max-h-32 overflow-y-auto">
                      <p className="text-sm text-slate-200 whitespace-pre-wrap">
                        {settings.video_order_terms_text}
                      </p>
                    </div>
                    <label className="flex items-center gap-3 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={formData.agree_to_terms}
                        onChange={(e) => setFormData({ ...formData, agree_to_terms: e.target.checked })}
                        className="w-4 h-4 text-primary-500 bg-black/50 border-red-900/30 rounded focus:ring-primary-500"
                      />
                      I agree to the terms and conditions
                    </label>
                  </div>
                )}

                {/* Price Summary */}
                <div className="dr-card rounded-xl p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400">Video Duration:</span>
                    <span className="text-white font-medium">{getDuration(formData.video_type)} Minutes</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Total Price:</span>
                    <span className="text-2xl font-bold text-primary-400">AED {calculatePrice(formData.video_type)}</span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-3 dr-btn-primary px-8 py-4 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Video className="w-6 h-6" />
                      Submit Request
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Contact Information */}
        {(settings.video_order_contact_phone || settings.video_order_contact_whatsapp) && (
          <div className="max-w-4xl mx-auto mt-16">
            <div className="dr-panel p-8 text-center hover:border-primary-500/60 hover:shadow-red-glow transition-all">
              <h3 className="text-2xl font-bold text-white mb-6 font-display tracking-wide">Need Help?</h3>
              <p className="text-slate-300 mb-8">
                Have questions about video orders? Contact us for assistance.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {settings.video_order_contact_phone && (
                  <a
                    href={`tel:${settings.video_order_contact_phone}`}
                    className="flex items-center justify-center gap-2 dr-btn-ghost px-6 py-3"
                  >
                    <Phone className="w-5 h-5" />
                    {settings.video_order_contact_phone}
                  </a>
                )}
                {settings.video_order_contact_whatsapp && (
                  <a
                    href={`https://wa.me/${settings.video_order_contact_whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-green-500/20 border border-green-500/30 text-green-400 rounded-xl hover:border-green-500/50 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    WhatsApp
                  </a>
                )}
                <button
                  onClick={() => { window.location.href = '/contact'; }}
                  className="flex items-center justify-center gap-2 dr-btn-ghost px-6 py-3"
                >
                  <Phone className="w-5 h-5" />
                  Request a Call
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
