import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEOHead from '../../components/SEOHead';

interface StaticPageProps {
  slug: string;
  onNavigate: (page: string) => void;
}

interface PageData {
  id: string;
  title: string;
  slug: string;
  content: string;
  page_type: string;
  meta_title: string | null;
  meta_description: string | null;
  schema_markup: any;
}

export default function StaticPage({ slug, onNavigate }: StaticPageProps) {
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPage();
  }, [slug]);

  const loadPage = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('static_pages')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setError('Page not found');
        setPage(null);
      } else {
        setPage(data);
      }
    } catch (err: any) {
      console.error('Error loading page:', err);
      setError(err.message || 'Failed to load page');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Page Not Found</h1>
          <p className="text-slate-400 mb-8">{error || 'The page you are looking for does not exist.'}</p>
          <button
            onClick={() => onNavigate('home')}
            className="px-6 py-3 bg-primary-500 text-white font-bold rounded-lg hover:bg-primary-600 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        pageIdentifier={`page-${page.slug}`}
        fallbackTitle={page.meta_title || page.title}
        fallbackDescription={page.meta_description || ''}
      />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-8 md:p-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">
              {page.title}
            </h1>
            <div
              className="prose prose-invert prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
