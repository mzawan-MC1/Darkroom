import { MapPin, Phone, Mail, Clock, Send, MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import SEOHead from '../../components/SEOHead';

interface ContactPageProps {
  onNavigate: (page: string) => void;
}

// Contact message interface removed - not used in this component

interface SiteSettings {
  contact_hero_title: string;
  contact_hero_subtitle: string;
  contact_hero_background: string;
  contact_map_embed_url: string;
  google_maps_embed_url: string;
  contact_show_map: boolean;
  contact_show_form: boolean;
  contact_additional_info: string;
  phone_number: string;
  whatsapp_number: string;
  whatsapp_enabled: boolean;
  primary_email: string;
  address: string;
  footer_opening_hours: OpeningHour[];
  contact_faqs: ContactFaqItem[];
}

interface OpeningHour {
  days: string;
  hours: string;
}

interface ContactFaqItem {
  question: string;
  answer: string;
}

export default function ContactPage({ onNavigate }: ContactPageProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'contact_hero_title',
          'contact_hero_subtitle',
          'contact_hero_background',
          'contact_map_embed_url',
          'google_maps_embed_url',
          'contact_show_map',
          'contact_show_form',
          'contact_additional_info',
          'phone_number',
          'whatsapp_number',
          'whatsapp_enabled',
          'primary_email',
          'address',
          'footer_opening_hours',
          'contact_faqs',
        ]);

      if (error) throw error;

      const settingsObj: any = {};
      data?.forEach((item: any) => {
        const key = item.setting_key;
        const value = item.setting_value;
        if (key === 'footer_opening_hours' || key === 'contact_faqs') {
          settingsObj[key] = Array.isArray(value) ? value : [];
        } else if (key.includes('show_') || key.includes('enabled')) {
          settingsObj[key] = typeof value === 'boolean' ? value : (typeof value === 'string' ? (value === 'true' || value === '1') : value);
        } else {
          settingsObj[key] = value;
        }
      });

      setSettings({
        contact_hero_title: settingsObj.contact_hero_title || 'Get In Touch',
        contact_hero_subtitle: settingsObj.contact_hero_subtitle || 'We\'d love to hear from you. Send us a message and we\'ll respond as soon as possible.',
        contact_hero_background: settingsObj.contact_hero_background || '',
        contact_map_embed_url: settingsObj.contact_map_embed_url || 'https://www.openstreetmap.org/export/embed.html?bbox=55.241%2C25.161%2C55.321%2C25.221&layer=mapnik&marker=25.191%2C55.281',
        google_maps_embed_url: settingsObj.google_maps_embed_url || '',
        contact_show_map: settingsObj.contact_show_map !== false,
        contact_show_form: settingsObj.contact_show_form !== false,
        contact_additional_info: settingsObj.contact_additional_info || '',
        phone_number: settingsObj.phone_number || '+971 4 555 0123',
        whatsapp_number: settingsObj.whatsapp_number || '',
        whatsapp_enabled: settingsObj.whatsapp_enabled === true,
        primary_email: settingsObj.primary_email || 'hello@darkroom.ae',
        address: settingsObj.address || 'Al Quoz, Dubai, United Arab Emirates',
        footer_opening_hours: settingsObj.footer_opening_hours || [],
        contact_faqs: settingsObj.contact_faqs || [],
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('contact_messages')
        .insert([{
          user_id: user?.id || null,
          full_name: formData.name,
          email: formData.email,
          phone: formData.phone,
          subject: formData.subject,
          message: formData.message,
          status: 'new',
        }] as any);

      if (error) throw error;

      const adminEmail = settings?.primary_email || 'hello@darkroom.ae';
      const notificationSubject = `New Contact Message: ${formData.subject}`;
      const notificationBody = `Name: ${formData.name}\nEmail: ${formData.email}\nPhone: ${formData.phone}\nSubject: ${formData.subject}\n\nMessage:\n${formData.message}`;

      await supabase
        .from('email_notifications')
        .insert([{
          recipient_email: adminEmail,
          recipient_user_id: null,
          email_type: 'contact_new_message',
          subject: notificationSubject,
          body: notificationBody,
          status: 'pending',
          metadata: { source: 'contact_page' },
        }] as any);

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      }, 5000);
    } catch (error) {
      console.error('Error submitting message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSaving(false);
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

  const mapUrl =
    settings.contact_map_embed_url ||
    settings.google_maps_embed_url ||
    'https://www.openstreetmap.org/export/embed.html?bbox=55.241%2C25.161%2C55.321%2C25.221&layer=mapnik&marker=25.191%2C55.281';
  const openingHours = settings.footer_opening_hours.length > 0
    ? settings.footer_opening_hours
    : [
        { days: 'Monday - Thursday', hours: '10:00 AM - 11:00 PM' },
        { days: 'Friday - Sunday', hours: '10:00 AM - 12:00 AM' },
      ];
  const openingHoursSummary = openingHours[0]?.hours || '10:00 AM - 11:00 PM';
  const faqItems = settings.contact_faqs.length > 0
    ? settings.contact_faqs
    : [
        {
          question: 'Do I need to book in advance?',
          answer: 'We highly recommend booking in advance to secure your preferred time slot, especially on weekends.',
        },
        {
          question: 'What should I bring?',
          answer: 'Just bring yourself and your team. We provide everything you need for the experience.',
        },
        {
          question: 'Is parking available?',
          answer: 'Yes, free parking is available for all DarkRoom guests at our location.',
        },
      ];
  const whatsappHref = settings.whatsapp_number
    ? `https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}`
    : '';

  return (
    <div className="min-h-screen bg-charcoal-950 bg-horror-radial pt-24 pb-12">
      <SEOHead
        pageIdentifier="contact"
        fallbackTitle="Contact Us - Escape Room"
        fallbackDescription="Get in touch with us. We're here to answer your questions and help you book your escape room adventure."
      />
      
      {/* Hero Section */}
      <div 
        className="relative h-96 flex items-center justify-center text-center mb-12"
        style={{
          backgroundImage: settings.contact_hero_background ? `url(${settings.contact_hero_background})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="absolute inset-0 opacity-[0.12] bg-horror-grain" style={{ backgroundSize: '4px 4px' }}></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4">
          <p className="text-primary-300 text-xs tracking-[0.35em] uppercase font-semibold mb-4">
            Reach the Keepers
          </p>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 font-display tracking-wide">
            {settings.contact_hero_title}
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto">
            {settings.contact_hero_subtitle}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Contact Information Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="dr-card p-8 text-center hover:border-primary-500/60 hover:shadow-red-glow transition-all">
            <div className="w-16 h-16 bg-black/35 border border-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-red-glow">
              <MapPin className="w-8 h-8 text-primary-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Visit Us</h3>
            <p className="text-slate-300 whitespace-pre-line">
              {settings.address}
            </p>
          </div>

          <div className="dr-card p-8 text-center hover:border-primary-500/60 hover:shadow-red-glow transition-all">
            <div className="w-16 h-16 bg-black/35 border border-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-red-glow">
              <Phone className="w-8 h-8 text-primary-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Call Us</h3>
            <p className="text-slate-300">
              {settings.phone_number}<br />
              Available {openingHoursSummary}
            </p>
            {settings.whatsapp_enabled && settings.whatsapp_number && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg hover:border-green-500/50 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </a>
            )}
          </div>

          <div className="dr-card p-8 text-center hover:border-primary-500/60 hover:shadow-red-glow transition-all">
            <div className="w-16 h-16 bg-black/35 border border-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-red-glow">
              <Mail className="w-8 h-8 text-primary-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Email Us</h3>
            <p className="text-slate-300">
              {settings.primary_email}<br />
              We'll reply within 24 hours
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          {settings.contact_show_form && (
            <div>
              <div className="dr-panel p-8 hover:border-primary-500/60 hover:shadow-red-glow transition-all">
                <h2 className="text-2xl font-bold text-white mb-6 font-display tracking-wide">Send Us a Message</h2>
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-black/35 border border-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-red-glow">
                      <Send className="w-8 h-8 text-primary-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Message Sent!</h3>
                    <p className="text-slate-300">We'll get back to you soon.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Your Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="dr-input px-4 py-3"
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="dr-input px-4 py-3"
                          placeholder="john@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="dr-input px-4 py-3"
                          placeholder="+971 XX XXX XXXX"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Subject
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="dr-input px-4 py-3"
                        placeholder="How can we help you?"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Message
                      </label>
                      <textarea
                        required
                        rows={6}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="dr-textarea px-4 py-3"
                        placeholder="Tell us more about your inquiry..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full flex items-center justify-center gap-2 dr-btn-primary px-6 py-4 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Send Message
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>

              {/* Additional Information */}
              {settings.contact_additional_info && (
                <div className="dr-panel p-8 mt-8 hover:border-primary-500/60 hover:shadow-red-glow transition-all">
                  <h3 className="text-xl font-semibold text-white mb-4 font-display tracking-wide">Additional Information</h3>
                  <div className="text-slate-300 whitespace-pre-line">
                    {settings.contact_additional_info}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Right Column */}
          <div>
            {/* Map */}
            {settings.contact_show_map && mapUrl && (
              <div className="dr-panel p-8 mb-8 hover:border-primary-500/60 hover:shadow-red-glow transition-all">
                <h2 className="text-2xl font-bold text-white mb-6 font-display tracking-wide">Find Us</h2>
                <div className="aspect-video rounded-xl overflow-hidden border border-red-900/30">
                  <iframe
                    src={mapUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen={true}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
                </div>
              </div>
            )}

            {/* Opening Hours */}
            <div className="dr-panel p-8 mb-8 hover:border-primary-500/60 hover:shadow-red-glow transition-all">
              <h2 className="text-2xl font-bold text-white mb-6 font-display tracking-wide">Opening Hours</h2>
              <div className="space-y-4">
                {openingHours.map((hour, index) => (
                  <div key={index} className="flex items-center justify-between pb-4 border-b border-red-900/30">
                    <span className="font-medium text-white">{hour.days}</span>
                    <span className="text-slate-400">{hour.hours}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-primary-500 mt-6">
                  <Clock className="w-5 h-5" />
                  <span className="text-sm font-medium">Last booking 1 hour before closing</span>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="dr-panel p-8 text-white hover:border-primary-500/60 hover:shadow-red-glow transition-all">
              <h3 className="text-2xl font-bold mb-4 font-display tracking-wide">Ready to Book?</h3>
              <p className="text-slate-300 mb-6">
                Don't wait! Book your escape room adventure now and secure your preferred time slot.
              </p>
              <button
                onClick={() => onNavigate('book')}
                className="w-full dr-btn-primary px-6 py-3"
              >
                Book Now
              </button>
            </div>

            {/* FAQ */}
            <div className="dr-panel p-8 mt-8 hover:border-primary-500/60 hover:shadow-red-glow transition-all">
              <h3 className="text-xl font-semibold text-white mb-4 font-display tracking-wide">FAQ</h3>
              <div className="space-y-4">
                {faqItems.map((item, index) => (
                  <div key={index}>
                    <h4 className="font-medium text-white mb-1">{item.question}</h4>
                    <p className="text-sm text-slate-300">{item.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
