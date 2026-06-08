import { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, PenTool, Edit2, Save, X, AlertCircle, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sendWaiverSignedEmail } from '../lib/emailService';
import { generateWaiverPDF, uploadWaiverPDF, getWaiverPdfUrl } from '../lib/waiverPdfGenerator';

interface Waiver {
  id: string;
  player_number: number;
  waiver_status: string;
  participant_name: string | null;
  participant_email: string | null;
  participant_phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  signature_data: string | null;
  signed_at: string | null;
  signed_pdf_url: string | null;
}

interface WaiverTemplate {
  id: string;
  title: string;
  content: string;
  version: string;
}

interface BookingWaiversSectionProps {
  bookingId: string;
  gameName: string;
  numberOfPlayers: number;
  onUpdate: () => void;
}

export default function BookingWaiversSection({
  bookingId,
  gameName,
  numberOfPlayers,
  onUpdate,
}: BookingWaiversSectionProps) {
  const [waivers, setWaivers] = useState<Waiver[]>([]);
  const [template, setTemplate] = useState<WaiverTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
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
  }, [bookingId]);

  const fetchWaivers = async () => {
    try {
      const { data, error } = await supabase
        .from('waivers')
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

  const handleEditName = (waiver: Waiver) => {
    setEditingPlayerId(waiver.id);
    setEditedName(waiver.participant_name || `Player ${waiver.player_number}`);
  };

  const handleSaveName = async (waiverId: string) => {
    try {
      const { error } = await (supabase
        .from('waivers') as any)
        .update({ participant_name: editedName })
        .eq('id', waiverId);

      if (error) throw error;

      await fetchWaivers();
      setEditingPlayerId(null);
      onUpdate();
    } catch (err) {
      console.error('Error updating player name:', err);
      alert('Failed to update player name');
    }
  };

  const handleSignWaiver = (waiver: Waiver) => {
    setSigningWaiver(waiver);
    setFormData({
      participant_name: waiver.participant_name || '',
      participant_email: waiver.participant_email || '',
      participant_phone: waiver.participant_phone || '',
      emergency_contact_name: waiver.emergency_contact_name || '',
      emergency_contact_phone: waiver.emergency_contact_phone || '',
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
      // Get booking details first for PDF generation
      const { data: bookingData } = await supabase
        .from('bookings')
        .select('booking_number, booking_date')
        .eq('id', bookingId)
        .single();

      if (!bookingData) throw new Error('Booking not found');

      const bookingInfo = bookingData as any;

      // Generate PDF
      let pdfUrl: string | null = null;
      if (template) {
        try {
          const pdfBlob = await generateWaiverPDF({
            participantName: formData.participant_name,
            participantEmail: formData.participant_email,
            participantPhone: formData.participant_phone || undefined,
            emergencyContactName: formData.emergency_contact_name || undefined,
            emergencyContactPhone: formData.emergency_contact_phone || undefined,
            signature: formData.signature,
            signedAt: new Date().toISOString(),
            bookingNumber: bookingInfo.booking_number,
            gameName: gameName,
            bookingDate: bookingInfo.booking_date,
            templateTitle: template.title,
            templateContent: template.content,
            templateVersion: template.version,
          });

          const fileName = `waiver-${bookingInfo.booking_number}-player${signingWaiver?.player_number}-${Date.now()}.pdf`;
          const uploadResult = await uploadWaiverPDF(signingWaiver!.id, pdfBlob, fileName);

          if (uploadResult.success && uploadResult.path) {
            pdfUrl = uploadResult.path;
          }
        } catch (pdfError) {
          console.error('Failed to generate PDF, continuing with waiver signing:', pdfError);
        }
      }

      // Update waiver with signature and PDF URL
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
          signed_pdf_url: pdfUrl,
        })
        .eq('id', signingWaiver?.id);

      if (updateError) throw updateError;

      if (formData.participant_email) {
        try {
          await sendWaiverSignedEmail(
            formData.participant_email,
            formData.participant_name,
            gameName,
            bookingInfo.booking_number,
            new Date(bookingInfo.booking_date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          );
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
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900">Waivers</h3>
        </div>
        {allSigned ? (
          <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            All Signed ({signedCount}/{numberOfPlayers})
          </span>
        ) : (
          <span className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
            <Clock className="w-4 h-4" />
            {signedCount}/{numberOfPlayers} Signed
          </span>
        )}
      </div>

      {!allSigned && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            All players must sign waivers before the booking is considered ready.
            Edit player names and collect signatures below.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {waivers.map((waiver) => (
          <div
            key={waiver.id}
            className="bg-slate-50 border border-slate-200 rounded-lg p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-slate-500">
                    Player #{waiver.player_number}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border inline-flex items-center gap-1 ${getStatusColor(waiver.waiver_status)}`}>
                    {getStatusIcon(waiver.waiver_status)}
                    {waiver.waiver_status}
                  </span>
                </div>

                {editingPlayerId === waiver.id ? (
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                      placeholder="Player name"
                    />
                    <button
                      onClick={() => handleSaveName(waiver.id)}
                      className="p-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      title="Save"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingPlayerId(null)}
                      className="p-1.5 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-slate-900">
                      {waiver.participant_name || `Player ${waiver.player_number}`}
                    </span>
                    {waiver.waiver_status === 'pending' && (
                      <button
                        onClick={() => handleEditName(waiver)}
                        className="p-1 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded"
                        title="Edit name"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {waiver.waiver_status === 'signed' && (
                  <div className="space-y-1 text-sm text-slate-600">
                    {waiver.participant_email && (
                      <div>Email: {waiver.participant_email}</div>
                    )}
                    {waiver.participant_phone && (
                      <div>Phone: {waiver.participant_phone}</div>
                    )}
                    {waiver.signed_at && (
                      <div>
                        Signed: {new Date(waiver.signed_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {waiver.waiver_status === 'pending' && (
                  <button
                    onClick={() => handleSignWaiver(waiver)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm"
                  >
                    <PenTool className="w-4 h-4" />
                    Sign Waiver
                  </button>
                )}

                {waiver.waiver_status === 'signed' && waiver.signed_pdf_url && (
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
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    title="View Signed PDF"
                  >
                    <Download className="w-4 h-4" />
                    View PDF
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {signingWaiver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl my-8">
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div>
                <h3 className="text-xl font-bold text-white">Sign Waiver</h3>
                <p className="text-sm text-primary-100">
                  Player #{signingWaiver.player_number} - {gameName}
                </p>
              </div>
              <button
                onClick={() => setSigningWaiver(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {template && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">{template.title}</h4>
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
                  Cancel
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
                      <CheckCircle className="w-5 h-5" />
                      Sign Waiver
                    </>
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
