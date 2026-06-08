import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface OpeningHour {
  days: string;
  hours: string;
}

interface QuickLink {
  label: string;
  page: string;
}

interface FooterSettings {
  footer_company_intro: string;
  footer_copyright_text: string;
  footer_opening_hours: OpeningHour[];
  footer_quick_links: QuickLink[];
}

export default function FooterSettingsSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [settings, setSettings] = useState<FooterSettings>({
    footer_company_intro: '',
    footer_copyright_text: '',
    footer_opening_hours: [],
    footer_quick_links: [],
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['footer_company_intro', 'footer_copyright_text', 'footer_opening_hours', 'footer_quick_links']);

      if (error) throw error;

      const settingsObj: any = {};
      data?.forEach((item: any) => {
        const key = item.setting_key;
        const value = item.setting_value;

        if (key === 'footer_opening_hours' || key === 'footer_quick_links') {
          settingsObj[key] = Array.isArray(value) ? value : [];
        } else {
          settingsObj[key] = typeof value === 'string' ? value : value || '';
        }
      });

      setSettings({
        footer_company_intro: settingsObj.footer_company_intro || '',
        footer_copyright_text: settingsObj.footer_copyright_text || '',
        footer_opening_hours: settingsObj.footer_opening_hours || [],
        footer_quick_links: settingsObj.footer_quick_links || [],
      });
    } catch (error) {
      console.error('Error loading footer settings:', error);
      setMessage({ type: 'error', text: 'Failed to load footer settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const settingsToSave = [
        { key: 'footer_company_intro', value: settings.footer_company_intro },
        { key: 'footer_copyright_text', value: settings.footer_copyright_text },
        { key: 'footer_opening_hours', value: settings.footer_opening_hours },
        { key: 'footer_quick_links', value: settings.footer_quick_links },
      ];

      for (const setting of settingsToSave) {
        const { error } = await (supabase
          .from('site_settings') as any)
          .upsert(
            {
              setting_key: setting.key,
              setting_value: setting.value,
              setting_type: setting.key.includes('intro') || setting.key.includes('copyright') ? 'text' : 'json',
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'setting_key',
            }
          );

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Footer settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving footer settings:', error);
      setMessage({ type: 'error', text: 'Failed to save footer settings' });
    } finally {
      setSaving(false);
    }
  };

  const addOpeningHour = () => {
    setSettings(prev => ({
      ...prev,
      footer_opening_hours: [...prev.footer_opening_hours, { days: '', hours: '' }]
    }));
  };

  const updateOpeningHour = (index: number, field: 'days' | 'hours', value: string) => {
    setSettings(prev => ({
      ...prev,
      footer_opening_hours: prev.footer_opening_hours.map((hour, i) =>
        i === index ? { ...hour, [field]: value } : hour
      )
    }));
  };

  const removeOpeningHour = (index: number) => {
    setSettings(prev => ({
      ...prev,
      footer_opening_hours: prev.footer_opening_hours.filter((_, i) => i !== index)
    }));
  };

  const addQuickLink = () => {
    setSettings(prev => ({
      ...prev,
      footer_quick_links: [...prev.footer_quick_links, { label: '', page: '' }]
    }));
  };

  const updateQuickLink = (index: number, field: 'label' | 'page', value: string) => {
    setSettings(prev => ({
      ...prev,
      footer_quick_links: prev.footer_quick_links.map((link, i) =>
        i === index ? { ...link, [field]: value } : link
      )
    }));
  };

  const removeQuickLink = (index: number) => {
    setSettings(prev => ({
      ...prev,
      footer_quick_links: prev.footer_quick_links.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return null;
  }

  return (
    <div className="px-6 pb-6">
      <div className="flex items-center justify-end mb-6 pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-slate-400 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          {saving ? 'Saving...' : 'Save Footer Settings'}
        </button>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Company Introduction
          </label>
          <textarea
            value={settings.footer_company_intro}
            onChange={(e) => setSettings(prev => ({ ...prev, footer_company_intro: e.target.value }))}
            className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
            rows={3}
            placeholder="Experience the ultimate escape room adventure..."
          />
          <p className="text-xs text-slate-500 mt-1">
            Short description that appears in the footer
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Copyright Text
          </label>
          <input
            type="text"
            value={settings.footer_copyright_text}
            onChange={(e) => setSettings(prev => ({ ...prev, footer_copyright_text: e.target.value }))}
            className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
            placeholder="EscapeZone. All rights reserved."
          />
          <p className="text-xs text-slate-500 mt-1">
            Copyright text (year and © symbol will be added automatically)
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-slate-700">
              Opening Hours
            </label>
            <button
              onClick={addOpeningHour}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Hours
            </button>
          </div>
          <div className="space-y-3">
            {settings.footer_opening_hours.map((hour, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="flex-1">
                  <input
                    type="text"
                    value={hour.days}
                    onChange={(e) => updateOpeningHour(index, 'days', e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                    placeholder="Monday - Thursday"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={hour.hours}
                    onChange={(e) => updateOpeningHour(index, 'hours', e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                    placeholder="10:00 AM - 11:00 PM"
                  />
                </div>
                <button
                  onClick={() => removeOpeningHour(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {settings.footer_opening_hours.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4 border-2 border-dashed border-slate-200 rounded-lg">
                No opening hours added. Click "Add Hours" to add entries.
              </p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-slate-700">
              Quick Links
            </label>
            <button
              onClick={addQuickLink}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Link
            </button>
          </div>
          <div className="space-y-3">
            {settings.footer_quick_links.map((link, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="flex-1">
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => updateQuickLink(index, 'label', e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                    placeholder="Our Games"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={link.page}
                    onChange={(e) => updateQuickLink(index, 'page', e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                    placeholder="games"
                  />
                </div>
                <button
                  onClick={() => removeQuickLink(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {settings.footer_quick_links.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4 border-2 border-dashed border-slate-200 rounded-lg">
                No quick links added. Click "Add Link" to add entries.
              </p>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Page values: home, games, lobby-games, merchandise, about, contact, book
          </p>
        </div>
      </div>
    </div>
  );
}
