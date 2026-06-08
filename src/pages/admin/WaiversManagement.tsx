import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Search, Download, Eye, RefreshCw, FileCheck } from 'lucide-react';
import type { Database } from '../../lib/database.types';
import { getWaiverPdfUrl, generateWaiverPDF, uploadWaiverPDF } from '../../lib/waiverPdfGenerator';
import AdminPagination from '../../components/AdminPagination';

type Waiver = Database['public']['Tables']['waivers']['Row'] & {
  booking_number?: string;
  signed_pdf_url?: string | null;
  game_name?: string;
};

export default function WaiversManagement() {
  const [waivers, setWaivers] = useState<Waiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWaiver, setSelectedWaiver] = useState<Waiver | null>(null);
  const [regeneratingPdfs, setRegeneratingPdfs] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchWaivers();
  }, [currentPage, pageSize, searchTerm]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearchTerm((prev) => (prev === searchInput ? prev : searchInput));
      setCurrentPage((prev) => (prev === 1 ? prev : 1));
    }, 300);

    return () => clearTimeout(handle);
  }, [searchInput]);

  const fetchWaivers = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('waivers')
        .select(`
          *,
          bookings(booking_number)
        `, { count: 'exact' })
        .eq('waiver_status', 'signed');

      // Apply Search
      if (searchTerm) {
        query = query.or(`participant_name.ilike.%${searchTerm}%,participant_email.ilike.%${searchTerm}%,participant_phone.ilike.%${searchTerm}%`);
      }

      // Apply Pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      
      query = query
        .order('signed_at', { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching waivers:', error);
        throw error;
      }
      
      setTotalItems(count || 0);

      const formattedData = data?.map((item: any) => ({
        ...item,
        booking_number: item.bookings?.booking_number
      })) || [];

      setWaivers(formattedData);
    } catch (error: any) {
      console.error('Error fetching waivers:', error);
      alert(`Failed to load waivers: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering removed
  // const filteredWaivers = ...

  const regenerateAllPdfs = async () => {
    if (!confirm('This will generate PDFs for all signed waivers that don\'t have one. This may take a few moments. Continue?')) {
      return;
    }

    setRegeneratingPdfs(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const waiversWithoutPdf = waivers.filter(w => !w.signed_pdf_url);

      for (const waiver of waiversWithoutPdf) {
        try {
          if (!waiver.booking_id) {
            console.error(`No booking ID for waiver ${waiver.id}`);
            failCount++;
            continue;
          }

          const { data: bookingDataResult } = await supabase
            .from('bookings')
            .select('booking_number, booking_date')
            .eq('id', waiver.booking_id)
            .single();
          
          const bookingData = bookingDataResult as any;

          if (!bookingData) {
            console.error(`Booking not found for waiver ${waiver.id}`);
            failCount++;
            continue;
          }

          if (!waiver.template_content || !waiver.template_title || !waiver.template_version) {
            console.error(`Missing template data for waiver ${waiver.id}`);
            failCount++;
            continue;
          }

          const pdfBlob = await generateWaiverPDF({
            participantName: waiver.participant_name || 'Unknown',
            participantEmail: waiver.participant_email || '',
            participantPhone: waiver.participant_phone || undefined,
            emergencyContactName: waiver.emergency_contact_name || undefined,
            emergencyContactPhone: waiver.emergency_contact_phone || undefined,
            signature: waiver.signature_data || waiver.participant_name || 'Signed',
            signedAt: waiver.signed_at || new Date().toISOString(),
            bookingNumber: bookingData.booking_number,
            gameName: waiver.game_name || 'Escape Room',
            bookingDate: bookingData.booking_date,
            templateTitle: waiver.template_title,
            templateContent: waiver.template_content,
            templateVersion: waiver.template_version,
          });

          const fileName = `waiver-${bookingData.booking_number}-${waiver.id}-${Date.now()}.pdf`;
          const uploadResult = await uploadWaiverPDF(waiver.id, pdfBlob, fileName);

          if (uploadResult.success && uploadResult.path) {
            const { error: updateError } = await (supabase
              .from('waivers') as any)
              .update({ signed_pdf_url: uploadResult.path })
              .eq('id', waiver.id);

            if (updateError) {
              console.error(`Failed to update waiver ${waiver.id}:`, updateError);
              failCount++;
            } else {
              successCount++;
            }
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`Error processing waiver ${waiver.id}:`, error);
          failCount++;
        }
      }

      alert(`PDF generation complete!\n\nSuccess: ${successCount}\nFailed: ${failCount}`);
      fetchWaivers();
    } catch (error) {
      console.error('Error regenerating PDFs:', error);
      alert('Failed to regenerate PDFs. Check console for details.');
    } finally {
      setRegeneratingPdfs(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Waivers Management</h3>
          <p className="text-slate-300 mt-1">View and manage all signed waivers</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={regenerateAllPdfs}
            disabled={regeneratingPdfs || waivers.filter(w => !w.signed_pdf_url).length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Generate PDFs for waivers without one"
          >
            {regeneratingPdfs ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generating...
              </>
            ) : (
              <>
                <FileCheck className="w-4 h-4" />
                Generate Missing PDFs ({waivers.filter(w => !w.signed_pdf_url).length})
              </>
            )}
          </button>
          <button
            onClick={() => {
              setLoading(true);
              fetchWaivers();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            title="Refresh waivers"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-black/50 rounded-xl border border-red-900/30 mb-6 p-4 hover:border-primary-500/50 transition-colors">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search waivers by name, email, or phone..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-500"
          />
        </div>
      </div>

      {loading && (
        <div className="text-sm text-slate-400 mb-6">
          Loading waivers...
        </div>
      )}

      <div className="bg-slate-900 rounded-xl border border-red-900/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black/50 border-b border-red-900/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Participant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Emergency Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Signed At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Valid Until
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-900/30">
              {waivers.length > 0 ? (
                waivers.map((waiver) => (
                  <tr key={waiver.id} className="hover:bg-black/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {waiver.participant_name}
                        </p>
                        {waiver.booking_number && (
                          <p className="text-xs text-primary-500 font-medium">
                            Booking: {waiver.booking_number}
                          </p>
                        )}
                        {waiver.game_name && (
                          <p className="text-xs text-slate-400">
                            Game: {waiver.game_name}
                          </p>
                        )}
                        {waiver.date_of_birth && (
                          <p className="text-xs text-slate-500">
                            DOB: {new Date(waiver.date_of_birth).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {waiver.participant_email && (
                          <p className="text-white">{waiver.participant_email}</p>
                        )}
                        {waiver.participant_phone && (
                          <p className="text-slate-400">{waiver.participant_phone}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {waiver.emergency_contact_name && (
                          <p className="text-white">{waiver.emergency_contact_name}</p>
                        )}
                        {waiver.emergency_contact_phone && (
                          <p className="text-slate-400">{waiver.emergency_contact_phone}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-white">
                      {waiver.signed_at
                        ? new Date(waiver.signed_at).toLocaleString()
                        : <span className="text-slate-500">Not signed</span>
                      }
                    </td>
                    <td className="px-6 py-4">
                      {waiver.valid_until ? (
                        <span
                          className={`text-sm ${
                            new Date(waiver.valid_until) > new Date()
                              ? 'text-primary-400'
                              : 'text-primary-500'
                          }`}
                        >
                          {new Date(waiver.valid_until).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-500">No expiry</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedWaiver(waiver)}
                          className="p-1 text-primary-500 hover:bg-primary-500/20 rounded transition-colors"
                          title="View Waiver Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {waiver.signed_pdf_url && (
                          <button
                            onClick={async () => {
                              try {
                                const url = await getWaiverPdfUrl(waiver.signed_pdf_url!);
                                if (url) {
                                  window.open(url, '_blank');
                                } else {
                                  alert('Failed to load PDF');
                                }
                              } catch (error) {
                                console.error('Error loading PDF:', error);
                                alert('Failed to load PDF');
                              }
                            }}
                            className="p-1 text-green-500 hover:bg-green-500/20 rounded transition-colors"
                            title="View PDF"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No waivers found</p>
                  </td>
                </tr>
              )}
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

      {selectedWaiver && (
        <WaiverModal waiver={selectedWaiver} onClose={() => setSelectedWaiver(null)} />
      )}
    </div>
  );
}

function WaiverModal({ waiver, onClose }: { waiver: Waiver; onClose: () => void }) {
  const [loadingPdf, setLoadingPdf] = useState(false);

  const handleViewPdf = async () => {
    if (!waiver.signed_pdf_url) {
      alert('No PDF available for this waiver');
      return;
    }

    setLoadingPdf(true);
    try {
      const url = await getWaiverPdfUrl(waiver.signed_pdf_url);
      if (url) {
        window.open(url, '_blank');
      } else {
        alert('Failed to load PDF');
      }
    } catch (error) {
      console.error('Error loading PDF:', error);
      alert('Failed to load PDF');
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 rounded-xl border border-red-900/30 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-red-900/30 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Waiver Details</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-black/30 border border-red-900/30 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              {waiver.booking_number && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Booking Number
                  </label>
                  <p className="text-sm font-semibold text-primary-500">{waiver.booking_number}</p>
                </div>
              )}
              {waiver.game_name && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Game
                  </label>
                  <p className="text-sm font-semibold text-white">{waiver.game_name}</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Participant Name
              </label>
              <p className="text-slate-300">{waiver.participant_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Date of Birth
              </label>
              <p className="text-slate-300">
                {waiver.date_of_birth
                  ? new Date(waiver.date_of_birth).toLocaleDateString()
                  : 'Not provided'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">Email</label>
              <p className="text-slate-300">{waiver.participant_email || 'Not provided'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Phone</label>
              <p className="text-slate-300">{waiver.participant_phone || 'Not provided'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Emergency Contact Name
              </label>
              <p className="text-slate-300">
                {waiver.emergency_contact_name || 'Not provided'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Emergency Contact Phone
              </label>
              <p className="text-slate-300">
                {waiver.emergency_contact_phone || 'Not provided'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Signature
            </label>
            <div className="border-2 border-red-900/30 rounded-lg p-4 bg-black/30">
              {waiver.signature_data ? (
                <div className="flex items-center justify-center min-h-[100px]">
                  {waiver.signature_data.startsWith('data:image/') ? (
                    <img
                      src={waiver.signature_data}
                      alt="Participant Signature"
                      className="max-w-full h-auto max-h-[150px]"
                      style={{ imageRendering: 'crisp-edges' }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = '<p class="text-red-500">Unable to display signature</p>';
                        }
                      }}
                    />
                  ) : (
                    <p
                      className="text-5xl text-white py-4"
                      style={{
                        fontFamily: "'Dancing Script', cursive",
                        fontWeight: 600,
                        letterSpacing: '0.5px'
                      }}
                    >
                      {waiver.signature_data}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4">No signature available</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Signed At
              </label>
              <p className="text-slate-300">
                {waiver.signed_at
                  ? new Date(waiver.signed_at).toLocaleString()
                  : 'Not signed yet'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Valid Until
              </label>
              <p className="text-slate-300">
                {waiver.valid_until
                  ? new Date(waiver.valid_until).toLocaleDateString()
                  : 'No expiry'}
              </p>
            </div>
          </div>

          {waiver.ip_address && (
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                IP Address
              </label>
              <p className="text-slate-300 font-mono text-sm">{waiver.ip_address}</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-slate-900 border-t border-red-900/30 px-6 py-4 flex gap-3">
          {waiver.signed_pdf_url && (
            <button
              onClick={handleViewPdf}
              disabled={loadingPdf}
              className="flex-1 flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {loadingPdf ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Loading...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  View Signed PDF
                </>
              )}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
