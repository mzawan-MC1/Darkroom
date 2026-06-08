import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import SEOHead from '../../components/SEOHead';

interface WaiverPageProps {
  onNavigate: (page: string) => void;
}

export default function WaiverPage({ onNavigate }: WaiverPageProps) {
  const [waiverTemplate, setWaiverTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveWaiver();
  }, []);

  const fetchActiveWaiver = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('waiver_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setWaiverTemplate(data);
    } catch (error: any) {
      console.error('Error fetching waiver:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black pt-12 pb-12">
      <SEOHead
        pageIdentifier="waiver"
        fallbackTitle="Waiver & Release of Liability - LockOut Escape Room"
        fallbackDescription="Read our waiver and release of liability policy."
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button 
          onClick={() => onNavigate('home')}
          className="mb-8 flex items-center text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </button>

        <div className="bg-white rounded-xl overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-r from-slate-800 to-black p-8 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                <FileText className="w-6 h-6 text-primary-500" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Waiver & Release of Liability</h1>
                <p className="text-slate-300 mt-1">Please read carefully before participating</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
                <p className="text-slate-500">Loading waiver policy...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-900 mb-2">Unable to load waiver</h3>
                <p className="text-red-700">{error}</p>
              </div>
            ) : !waiverTemplate ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">No active waiver found</h3>
                <p className="text-yellow-700">Please contact our staff for assistance.</p>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="prose prose-lg max-w-none text-slate-700">
                  <div dangerouslySetInnerHTML={{ __html: waiverTemplate.content }} />
                </div>

                {waiverTemplate.requirements && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-amber-900 mb-4 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Requirements & Rules
                    </h3>
                    <div 
                      className="prose prose-sm max-w-none text-amber-800"
                      dangerouslySetInnerHTML={{ __html: waiverTemplate.requirements }} 
                    />
                  </div>
                )}
                
                <div className="border-t border-slate-200 pt-8 text-center text-slate-500 text-sm">
                  <p>Version: {waiverTemplate.version} | Last Updated: {new Date(waiverTemplate.updated_at || waiverTemplate.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
