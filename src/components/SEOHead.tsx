import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';

interface SEOHeadProps {
  pageIdentifier?: string;
  fallbackTitle?: string;
  fallbackDescription?: string;
  title?: string;
  description?: string;
  image?: string;
  keywords?: string;
}

export default function SEOHead({
  pageIdentifier,
  fallbackTitle = 'Escape Room',
  fallbackDescription = 'Experience the ultimate escape room adventure',
  title: propTitle,
  description: propDescription,
  image: propImage,
  keywords: propKeywords
}: SEOHeadProps) {
  const [seoData, setSeoData] = useState<any>(null);

  useEffect(() => {
    if (pageIdentifier) {
      loadSEO(pageIdentifier);
    }
  }, [pageIdentifier]);

  const loadSEO = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('page_seo')
        .select('*')
        .eq('page_identifier', id)
        .maybeSingle();

      if (error) throw error;
      setSeoData(data);
    } catch (error) {
      console.error('Error loading SEO data:', error);
    }
  };

  // Priority: 1. DB Data (seoData) 2. Direct Props (propTitle) 3. Fallback
  const title = seoData?.meta_title || propTitle || fallbackTitle;
  const description = seoData?.meta_description || propDescription || fallbackDescription;
  const keywords = seoData?.keywords || propKeywords || '';
  const canonical = seoData?.canonical_url || window.location.pathname;
  const robots = seoData?.robots || 'index, follow';
  const ogTitle = seoData?.og_title || title;
  const ogDescription = seoData?.og_description || description;
  const ogImage = seoData?.og_image_url || propImage || '';

  const baseUrl = window.location.origin;
  const fullCanonical = canonical.startsWith('http') ? canonical : `${baseUrl}${canonical}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="robots" content={robots} />
      <link rel="canonical" href={fullCanonical} />

      {/* Open Graph */}
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={window.location.href} />
      {ogImage && <meta property="og:image" content={ogImage} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle} />
      <meta name="twitter:description" content={ogDescription} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
    </Helmet>
  );
}
