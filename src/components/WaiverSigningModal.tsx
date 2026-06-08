import { useState, useEffect } from 'react';
import { X, FileText, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sendWaiverSignedEmail } from '../lib/emailService';
import { generateWaiverPDF, uploadWaiverPDF } from '../lib/waiverPdfGenerator';

interface WaiverSigningModalProps {
  booking: {
    id: string;
    booking_number: string;
    booking_date: string;
    game: {
      id: string;
      name: string;
    };
  };
  user: {
    id: string;
    email: string;
    full_name: string;
    phone?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

interface WaiverTemplate {
  id: string;
  title: string;
  content: string;
  version: string;
}

export default function WaiverSigningModal({ booking, user, onClose, onSuccess }: WaiverSigningModalProps) {
  const [template, setTemplate] = useState<WaiverTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [formData, setFormData] = useState({
    participant_name: user.full_name || '',
    participant_email: user.email || '',
    participant_phone: user.phone || '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    signature: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWaiverTemplate();
  }, []);

  const fetchWaiverTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from('waiver_templates')
        .select('id, title, content, version')
        .eq('is_active', true)
        .single();

      if (error) throw error;
      setTemplate(data);
    } catch (err: any) {
      setError('Failed to load waiver template');
      console.error('Error fetching waiver template:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreed) {
      setError('You must agree to the terms before signing');
      return;
    }

    if (!formData.signature.trim()) {
      setError('Please enter your full name as signature');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const { data: pendingWaiver, error: fetchError } = await supabase
        .from('waivers')
        .select('id')
        .eq('booking_id', booking.id)
        .eq('user_id', user.id)
        .eq('waiver_status', 'pending')
        .order('player_number')
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!pendingWaiver) {
        throw new Error('No pending waiver slot found for your booking. Please contact support.');
      }

      const pendingWaiverId = (pendingWaiver as any).id;

      const signedAt = new Date().toISOString();

      // Generate PDF
      const pdfBlob = await generateWaiverPDF({
        participantName: formData.participant_name,
        participantEmail: formData.participant_email,
        participantPhone: formData.participant_phone,
        emergencyContactName: formData.emergency_contact_name,
        emergencyContactPhone: formData.emergency_contact_phone,
        signature: formData.signature,
        signedAt: signedAt,
        bookingNumber: booking.booking_number,
        gameName: booking.game.name,
        bookingDate: booking.booking_date,
        templateTitle: template?.title || 'Liability Waiver',
        templateContent: template?.content || '',
        templateVersion: template?.version || '1.0',
      });

      // Upload PDF to storage
      const fileName = `waiver-${booking.booking_number}-${Date.now()}.pdf`;
      const uploadResult = await uploadWaiverPDF(pendingWaiverId, pdfBlob, fileName);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload waiver PDF');
      }

      // Update waiver record with all details including PDF path
      const { error: waiverError } = await (supabase
        .from('waivers') as any)
        .update({
          waiver_template_id: template?.id,
          participant_name: formData.participant_name,
          participant_email: formData.participant_email,
          participant_phone: formData.participant_phone || null,
          emergency_contact_name: formData.emergency_contact_name || null,
          emergency_contact_phone: formData.emergency_contact_phone || null,
          signature_data: formData.signature,
          template_title: template?.title,
          template_version: template?.version,
          template_content: template?.content,
          waiver_status: 'signed',
          signed_at: signedAt,
          signed_pdf_url: uploadResult.path,
        })
        .eq('id', pendingWaiverId);

      if (waiverError) throw waiverError;

      try {
        await sendWaiverSignedEmail(
          formData.participant_email,
          formData.participant_name,
          booking.game.name,
          booking.booking_number,
          new Date(booking.booking_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        );
      } catch (emailError) {
        console.error('Failed to send waiver signed email:', emailError);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to sign waiver');
      console.error('Error signing waiver:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-950/75 border border-red-900/30 rounded-2xl shadow-panel w-full max-w-3xl p-8 backdrop-blur-md">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-950/75 border border-red-900/30 rounded-2xl shadow-panel w-full max-w-3xl p-8 backdrop-blur-md">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-primary-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Waiver Template Available</h3>
            <p className="text-slate-400 mb-6">Please contact support to complete your booking.</p>
            <button
              onClick={onClose}
              className="dr-btn-ghost px-6 py-2"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-950/75 border border-red-900/30 rounded-2xl shadow-panel w-full max-w-4xl my-8 backdrop-blur-md">
        <div className="bg-gradient-to-r from-primary-700 to-primary-900 px-6 py-4 flex items-center justify-between rounded-t-2xl border-b border-red-900/30">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Sign Waiver</h2>
              <p className="text-sm text-primary-100">
                Booking #{booking.booking_number} - {booking.game.name}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-primary-500/10 border border-red-900/30 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-primary-300 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-primary-200">{error}</p>
            </div>
          )}

          <div className="bg-black/25 border border-red-900/30 rounded-xl p-4">
            <h3 className="font-semibold text-slate-100 mb-2">{template.title}</h3>
            <div className="text-sm text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
              {template.content}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Participant Name <span className="text-primary-400">*</span>
              </label>
              <input
                type="text"
                value={formData.participant_name}
                onChange={(e) => setFormData({ ...formData, participant_name: e.target.value })}
                className="dr-input px-4"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Email <span className="text-primary-400">*</span>
              </label>
              <input
                type="email"
                value={formData.participant_email}
                onChange={(e) => setFormData({ ...formData, participant_email: e.target.value })}
                className="dr-input px-4"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.participant_phone}
                onChange={(e) => setFormData({ ...formData, participant_phone: e.target.value })}
                className="dr-input px-4"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Emergency Contact Name
              </label>
              <input
                type="text"
                value={formData.emergency_contact_name}
                onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                className="dr-input px-4"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Emergency Contact Phone
              </label>
              <input
                type="tel"
                value={formData.emergency_contact_phone}
                onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                className="dr-input px-4"
              />
            </div>
          </div>

          <div className="border-t border-red-900/30 pt-6">
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Signature (Type Your Full Name) <span className="text-primary-400">*</span>
            </label>
            <input
              type="text"
              value={formData.signature}
              onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
              placeholder="Type your full name here"
              className="w-full px-4 py-3 rounded-lg border border-red-900/30 bg-black/30 text-3xl text-primary-200 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/60"
              style={{
                fontFamily: "'Dancing Script', cursive",
                fontWeight: 600
              }}
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              By typing your name, you are providing an electronic signature
            </p>
          </div>

          <div className="bg-black/25 border border-red-900/30 rounded-xl p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 rounded border-red-900/40 bg-black/30 text-primary-500 focus:ring-primary-500/30"
                required
              />
              <span className="text-sm text-slate-200">
                I have read and agree to the terms and conditions outlined in this waiver. I understand
                that by signing this document, I am waiving certain legal rights.
              </span>
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-red-900/30">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 dr-btn-ghost px-6 py-3"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !agreed}
              className="flex-1 dr-btn-primary px-6 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
      </div>
    </div>
  );
}
