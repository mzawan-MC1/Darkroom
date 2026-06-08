import { useState, useEffect } from 'react';
import { X, FileText, AlertCircle, Check, User, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sendWaiverSignedEmail } from '../lib/emailService';

interface Waiver {
  id: string;
  player_number: number;
  waiver_status: string;
  participant_name: string | null;
  participant_email: string | null;
  participant_phone: string | null;
  signed_at: string | null;
}

interface AdminWaiverCollectionModalProps {
  bookingId: string;
  bookingNumber: string;
  gameName: string;
  numberOfPlayers: number;
  onClose: () => void;
  onUpdate: () => void;
}

interface WaiverTemplate {
  id: string;
  title: string;
  content: string;
  version: string;
}

export default function AdminWaiverCollectionModal({
  bookingId,
  bookingNumber,
  gameName,
  numberOfPlayers,
  onClose,
  onUpdate,
}: AdminWaiverCollectionModalProps) {
  const [waivers, setWaivers] = useState<Waiver[]>([]);
  const [template, setTemplate] = useState<WaiverTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingWaiver, setSigningWaiver] = useState<Waiver | null>(null);
  const [formData, setFormData] = useState({
    participant_name: '',
    participant_email: '',
    participant_phone: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    signature: '',
  });
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWaivers();
    fetchWaiverTemplate();
  }, []);

  const fetchWaivers = async () => {
    try {
      const { data, error } = await (supabase
        .from('waivers') as any)
        .select('*')
        .eq('booking_id', bookingId)
        .order('player_number');

      if (error) throw error;
      setWaivers(data || []);
    } catch (err) {
      console.error('Error fetching waivers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWaiverTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from('waiver_templates')
        .select('id, title, content, version')
        .eq('is_active', true)
        .single();

      if (error) throw error;
      setTemplate(data);
    } catch (err) {
      console.error('Error fetching waiver template:', err);
    }
  };

  const handleSignWaiver = (waiver: Waiver) => {
    setSigningWaiver(waiver);
    setFormData({
      participant_name: waiver.participant_name || '',
      participant_email: waiver.participant_email || '',
      participant_phone: waiver.participant_phone || '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      signature: '',
    });
    setAgreed(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreed) {
      setError('You must confirm agreement to the waiver terms');
      return;
    }

    if (!formData.signature.trim()) {
      setError('Please enter the participant\'s full name as signature');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const { error: updateError } = await (supabase
        .from('waivers') as any)
        .update({
          participant_name: formData.participant_name,
          participant_email: formData.participant_email || null,
          participant_phone: formData.participant_phone || null,
          emergency_contact_name: formData.emergency_contact_name || null,
          emergency_contact_phone: formData.emergency_contact_phone || null,
          signature_data: formData.signature,
          waiver_status: 'signed',
          signed_at: new Date().toISOString(),
          waiver_template_id: template?.id,
          template_title: template?.title,
          template_version: template?.version,
          template_content: template?.content,
        })
        .eq('id', signingWaiver?.id);

      if (updateError) throw updateError;

      if (formData.participant_email) {
        try {
          const { data: bookingData } = await (supabase
            .from('bookings') as any)
            .select('booking_date')
            .eq('id', bookingId)
            .single();

          if (bookingData) {
            await sendWaiverSignedEmail(
              formData.participant_email,
              formData.participant_name,
              gameName,
              bookingNumber,
              new Date(bookingData.booking_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            );
          }
        } catch (emailError) {
          console.error('Failed to send waiver signed email:', emailError);
        }
      }

      await fetchWaivers();
      setSigningWaiver(null);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to save waiver');
      console.error('Error signing waiver:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'signed':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const signedCount = waivers.filter(w => w.waiver_status === 'signed').length;
  const allSigned = signedCount === numberOfPlayers;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl my-8">
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Waiver Collection</h2>
              <p className="text-sm text-primary-100">
                Booking #{bookingNumber} - {gameName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6">
          {allSigned ? (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">All Waivers Signed</p>
                <p className="text-sm text-green-700">
                  All {numberOfPlayers} players have completed their waivers
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
              <div>
                <p className="font-semibold text-yellow-900">Waivers Required</p>
                <p className="text-sm text-yellow-700">
                  {signedCount} of {numberOfPlayers} waivers signed. {numberOfPlayers - signedCount} remaining.
                </p>
              </div>
            </div>
          )}

          {!signingWaiver ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {waivers.map((waiver) => (
                <div
                  key={waiver.id}
                  className="bg-white border border-slate-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {waiver.participant_name || `Player ${waiver.player_number}`}
                        </h3>
                        <p className="text-sm text-slate-600">Player #{waiver.player_number}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1 ${getStatusColor(waiver.waiver_status)}`}>
                      {getStatusIcon(waiver.waiver_status)}
                      {waiver.waiver_status}
                    </span>
                  </div>

                  {waiver.waiver_status === 'signed' ? (
                    <div className="space-y-2 text-sm">
                      {waiver.participant_email && (
                        <div>
                          <span className="text-slate-600">Email:</span>{' '}
                          <span className="text-slate-900">{waiver.participant_email}</span>
                        </div>
                      )}
                      {waiver.participant_phone && (
                        <div>
                          <span className="text-slate-600">Phone:</span>{' '}
                          <span className="text-slate-900">{waiver.participant_phone}</span>
                        </div>
                      )}
                      {waiver.signed_at && (
                        <div>
                          <span className="text-slate-600">Signed:</span>{' '}
                          <span className="text-slate-900">
                            {new Date(waiver.signed_at).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSignWaiver(waiver)}
                      className="w-full mt-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                    >
                      Sign Waiver
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-2">
                  Signing Waiver for Player #{signingWaiver.player_number}
                </h3>
                <p className="text-sm text-slate-600">
                  Fill in the participant's information and collect their signature
                </p>
              </div>

              {template && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">{template.title}</h3>
                  <div className="text-sm text-blue-800 whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {template.content}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Participant Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.participant_name}
                    onChange={(e) => setFormData({ ...formData, participant_name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.participant_email}
                    onChange={(e) => setFormData({ ...formData, participant_email: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.participant_phone}
                    onChange={(e) => setFormData({ ...formData, participant_phone: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Emergency Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Participant Signature (Type Full Name) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.signature}
                  onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
                  placeholder="Type participant's full name here"
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-3xl text-slate-800"
                  style={{
                    fontFamily: "'Dancing Script', cursive",
                    fontWeight: 600
                  }}
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  By typing the participant's name, you confirm they have read and agreed to the waiver
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 rounded text-primary-500 focus:ring-primary-500"
                    required
                  />
                  <span className="text-sm text-slate-700">
                    I confirm that the participant has read and agreed to the terms and conditions outlined
                    in this waiver, and understands that by signing this document, they are waiving certain
                    legal rights.
                  </span>
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSigningWaiver(null)}
                  className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  disabled={submitting}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting || !agreed}
                  className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Signing...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Sign Waiver
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
