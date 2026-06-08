import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface WhatsAppButtonProps {
  message?: string;
}

export default function WhatsAppButton({
  message = 'Hello! I would like to know more about your escape rooms.'
}: WhatsAppButtonProps) {
  const [whatsappNumber, setWhatsappNumber] = useState<string>('');
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadWhatsAppSettings();
  }, []);

  const loadWhatsAppSettings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['whatsapp_number', 'whatsapp_enabled']);

      if (error) throw error;

      if (data) {
        data.forEach((item: any) => {
          if (item.setting_key === 'whatsapp_number' && item.setting_value) {
            const val = item.setting_value;
            const value = typeof val === 'string' ? val : val?.value || '';
            if (value) {
              setWhatsappNumber(value);
            }
          }
          if (item.setting_key === 'whatsapp_enabled') {
            const val = item.setting_value;
            const enabled = val === true || val === 'true' || val === 1 || val === '1';
            setIsEnabled(enabled);
          }
        });
      }
    } catch (error) {
      console.error('Error loading WhatsApp settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = () => {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  if (isLoading || !isEnabled || !whatsappNumber) {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 left-6 z-50 w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 group"
      aria-label="Contact us on WhatsApp"
      title="Chat with us on WhatsApp"
    >
      <MessageCircle className="w-6 h-6 fill-current" />
      <span className="absolute left-full ml-3 bg-slate-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Chat on WhatsApp
      </span>
    </button>
  );
}
