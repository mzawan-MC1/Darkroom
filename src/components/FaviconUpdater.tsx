import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function FaviconUpdater() {
  useEffect(() => {
    loadFavicon();
  }, []);

  const loadFavicon = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'favicon_url')
        .maybeSingle();

      if (error) throw error;

      if ((data as any)?.setting_value) {
        const val = (data as any).setting_value;
        const faviconUrl = typeof val === 'string'
          ? val
          : val?.value || '';

        if (faviconUrl) {
          updateFavicon(faviconUrl);
        }
      }
    } catch (error) {
      console.error('Error loading favicon:', error);
    }
  };

  const updateFavicon = (url: string) => {
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");

    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    link.href = url;
    link.type = 'image/x-icon';
  };

  return null;
}
