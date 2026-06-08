import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOptimizedImageUrl } from '../lib/media';

interface PopupBannerSettings {
  id: string;
  is_enabled: boolean;
  title: string;
  description: string;
  image_url: string | null;
  mobile_image_url: string | null;
  banner_width: number;
  banner_height: number;
  button_text: string;
  button_url: string;
  show_on_load: boolean;
  delay_seconds: number;
  show_once_per_session: boolean;
  background_color: string;
  text_color: string;
  button_color: string;
}

export default function PopupBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [settings, setSettings] = useState<PopupBannerSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    fetchPopupSettings();
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchPopupSettings = async () => {
    try {
      const { data: rawData, error } = await supabase
        .from('popup_banner_settings')
        .select('*')
        .eq('is_enabled', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching popup banner settings:', error);
        setIsLoading(false);
        return;
      }

      const data = rawData as unknown as PopupBannerSettings | null;

      if (!data) {
        setIsLoading(false);
        return;
      }

      setSettings(data);

      // Check if popup should be shown based on session storage
      const sessionKey = `popup_shown_${data.id}`;
      const hasBeenShown = sessionStorage.getItem(sessionKey);

      if (data.show_once_per_session && hasBeenShown) {
        setIsLoading(false);
        return;
      }

      // Show popup after delay
      if (data.show_on_load) {
        const delay = (data.delay_seconds || 0) * 1000;
        setTimeout(() => {
          setIsVisible(true);
          setIsLoading(false);
        }, delay);
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error in fetchPopupSettings:', error);
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (settings && settings.show_once_per_session) {
      const sessionKey = `popup_shown_${settings.id}`;
      sessionStorage.setItem(sessionKey, 'true');
    }
    setIsVisible(false);
  };

  const handleButtonClick = () => {
    handleClose();
    if (settings?.button_url) {
      // Check if it's an external URL
      if (settings.button_url.startsWith('http')) {
        window.open(settings.button_url, '_blank', 'noopener,noreferrer');
      } else {
        // Internal navigation
        window.location.href = settings.button_url;
      }
    }
  };

  if (isLoading || !isVisible || !settings) {
    return null;
  }

  const hasTextContent = settings.title || settings.description || (settings.button_text && settings.button_url);
  const displayImageUrl = isMobile && settings.mobile_image_url ? settings.mobile_image_url : settings.image_url;
  const bannerWidth = settings.banner_width || 600;
  const bannerHeight = settings.banner_height || 400;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Popup Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative rounded-lg shadow-2xl overflow-hidden pointer-events-auto animate-in fade-in zoom-in duration-300"
          style={{
            backgroundColor: settings.background_color,
            color: settings.text_color,
            width: `${bannerWidth}px`,
            maxWidth: '100%',
          }}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black bg-opacity-20 hover:bg-opacity-30 transition-all"
            aria-label="Close popup"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Image Only Layout */}
          {!hasTextContent && displayImageUrl && (
            <div style={{ height: `${bannerHeight}px` }}>
              <img
                src={getOptimizedImageUrl(displayImageUrl, { width: 800 })}
                alt="Popup banner"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Image + Content Layout */}
          {hasTextContent && (
            <div className="flex flex-col md:flex-row" style={{ minHeight: `${bannerHeight}px` }}>
              {/* Image Section */}
              {displayImageUrl && (
                <div className="md:w-1/2">
                  <img
                    src={getOptimizedImageUrl(displayImageUrl, { width: 600 })}
                    alt={settings.title || 'Popup banner'}
                    className="w-full h-64 md:h-full object-cover"
                  />
                </div>
              )}

              {/* Content Section */}
              <div
                className={`p-8 flex flex-col justify-center ${
                  displayImageUrl ? 'md:w-1/2' : 'w-full'
                }`}
              >
                {settings.title && (
                  <h2
                    className="text-3xl font-bold mb-4"
                    style={{ color: settings.text_color }}
                  >
                    {settings.title}
                  </h2>
                )}

                {settings.description && (
                  <p
                    className="text-lg mb-6 leading-relaxed"
                    style={{ color: settings.text_color }}
                  >
                    {settings.description}
                  </p>
                )}

                {settings.button_text && settings.button_url && (
                  <button
                    onClick={handleButtonClick}
                    className="px-8 py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90 hover:scale-105"
                    style={{ backgroundColor: settings.button_color }}
                  >
                    {settings.button_text}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
