import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Save, X, CheckCircle, Star, Users, Trophy, Clock, Zap, Shield, Target, Award, Heart, Flag, Puzzle } from 'lucide-react';
import FileUpload from '../../components/FileUpload';

interface ChallengeSectionSettings {
  tagline: string;
  title: string;
  description: string;
  button_text: string;
  button_action: string;
  image: string;
  media_type: string;
}

interface ChallengeFeature {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  display_order: number;
  is_active: boolean;
}

const availableIcons = [
  { name: 'CheckCircle', component: CheckCircle },
  { name: 'Star', component: Star },
  { name: 'Users', component: Users },
  { name: 'Trophy', component: Trophy },
  { name: 'Clock', component: Clock },
  { name: 'Zap', component: Zap },
  { name: 'Shield', component: Shield },
  { name: 'Target', component: Target },
  { name: 'Award', component: Award },
  { name: 'Heart', component: Heart },
  { name: 'Flag', component: Flag },
  { name: 'Puzzle', component: Puzzle },
];

export default function ChallengeSectionSettings() {
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [isFeatureModalOpen, setIsFeatureModalOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<ChallengeFeature | null>(null);

  const [settings, setSettings] = useState<ChallengeSectionSettings>({
    tagline: 'THE ULTIMATE CHALLENGE',
    title: 'Face Your Fear',
    description: 'Immersive escape rooms with cutting-edge technology and mind-bending puzzles.',
    button_text: 'Explore Rooms',
    button_action: 'games',
    image: 'https://images.unsplash.com/photo-1614200187524-dc4b892acf16?w=800',
    media_type: 'image',
  });

  const [features, setFeatures] = useState<ChallengeFeature[]>([]);
  const [featureForm, setFeatureForm] = useState({
    title: '',
    description: '',
    icon_name: 'CheckCircle',
    display_order: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchSettings();
    fetchFeatures();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await (supabase
        .from('site_settings') as any)
        .select('setting_key, setting_value')
        .in('setting_key', [
          'challenge_section_tagline',
          'challenge_section_title',
          'challenge_section_description',
          'challenge_section_button_text',
          'challenge_section_button_action',
          'challenge_section_image',
          'challenge_section_media_type',
        ]);

      if (error) throw error;

      if (data && data.length > 0) {
        const newSettings: any = { ...settings };
        data.forEach((item: any) => {
          const key = item.setting_key.replace('challenge_section_', '');
          const value = typeof item.setting_value === 'string'
            ? item.setting_value
            : item.setting_value?.value || item.setting_value;
          newSettings[key] = value?.replace(/^"|"$/g, '') || newSettings[key];
        });
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeatures = async () => {
    try {
      const { data, error } = await supabase
        .from('challenge_features')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setFeatures(data || []);
    } catch (error) {
      console.error('Error fetching features:', error);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);

    try {
      const updates = [
        { key: 'challenge_section_tagline', value: settings.tagline },
        { key: 'challenge_section_title', value: settings.title },
        { key: 'challenge_section_description', value: settings.description },
        { key: 'challenge_section_button_text', value: settings.button_text },
        { key: 'challenge_section_button_action', value: settings.button_action },
        { key: 'challenge_section_image', value: settings.image },
        { key: 'challenge_section_media_type', value: settings.media_type },
      ];

      for (const update of updates) {
        const { error } = await (supabase
          .from('site_settings') as any)
          .upsert({
            setting_key: update.key,
            setting_value: `"${update.value}"`,
            setting_type: 'text',
          }, {
            onConflict: 'setting_key'
          });

        if (error) throw error;
      }

      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleMediaUpload = (url: string) => {
    const mediaType = url.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'image';
    setSettings({ ...settings, image: url, media_type: mediaType });
  };

  const handleFeatureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingFeature) {
        const { error } = await (supabase
          .from('challenge_features') as any)
          .update(featureForm)
          .eq('id', editingFeature.id);

        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from('challenge_features') as any)
          .insert([featureForm]);

        if (error) throw error;
      }

      await fetchFeatures();
      handleCloseFeatureModal();
    } catch (error) {
      console.error('Error saving feature:', error);
      alert('Failed to save feature');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFeature = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feature?')) return;

    try {
      const { error } = await (supabase
        .from('challenge_features') as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchFeatures();
    } catch (error) {
      console.error('Error deleting feature:', error);
      alert('Failed to delete feature');
    }
  };

  const handleEditFeature = (feature: ChallengeFeature) => {
    setEditingFeature(feature);
    setFeatureForm({
      title: feature.title,
      description: feature.description,
      icon_name: feature.icon_name,
      display_order: feature.display_order,
      is_active: feature.is_active,
    });
    setIsFeatureModalOpen(true);
  };

  const handleCloseFeatureModal = () => {
    setIsFeatureModalOpen(false);
    setEditingFeature(null);
    setFeatureForm({
      title: '',
      description: '',
      icon_name: 'CheckCircle',
      display_order: 0,
      is_active: true,
    });
  };

  const getIconComponent = (iconName: string) => {
    const icon = availableIcons.find((i) => i.name === iconName);
    return icon ? icon.component : CheckCircle;
  };

  if (loading && features.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Challenge Section Settings</h1>
        <p className="text-slate-300">Manage the "Ultimate Challenge" section on your landing page</p>
      </div>

      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-6">Section Settings</h2>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Tagline
            </label>
            <input
              type="text"
              value={settings.tagline}
              onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
              placeholder="THE ULTIMATE CHALLENGE"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Title
            </label>
            <input
              type="text"
              value={settings.title}
              onChange={(e) => setSettings({ ...settings, title: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
              placeholder="Face Your Fear"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={settings.description}
              onChange={(e) => setSettings({ ...settings, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
              placeholder="Immersive escape rooms with cutting-edge technology and mind-bending puzzles."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Button Text
              </label>
              <input
                type="text"
                value={settings.button_text}
                onChange={(e) => setSettings({ ...settings, button_text: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                placeholder="Explore Rooms"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Button Action (Page)
              </label>
              <select
                value={settings.button_action}
                onChange={(e) => setSettings({ ...settings, button_action: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
              >
                <option value="games">Games Page</option>
                <option value="book">Book Page</option>
                <option value="contact">Contact Page</option>
                <option value="about">About Page</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Background Media (Image or Video)
            </label>
            <FileUpload
              onUploadComplete={handleMediaUpload}
              currentImageUrl={settings.image}
              folder="challenge-section"
              accept="image/*,video/*"
            />
            <p className="text-sm text-slate-400 mt-2">
              Upload an image or video for the challenge section background. Videos should be short (under 30 seconds) for best performance.
            </p>
          </div>

          <button
            type="submit"
            disabled={savingSettings}
            className="flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {savingSettings ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>

      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Challenge Features</h2>
          <button
            onClick={() => setIsFeatureModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Feature
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {features.map((feature) => {
            const IconComponent = getIconComponent(feature.icon_name);
            return (
              <div
                key={feature.id}
                className="bg-slate-900 rounded-lg p-4 border border-slate-700 flex items-start justify-between"
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 bg-red-600/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <IconComponent className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                    <p className="text-slate-400 text-sm mb-2">{feature.description}</p>
                    <div className="flex gap-2">
                      {feature.is_active ? (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">Active</span>
                      ) : (
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">Inactive</span>
                      )}
                      <span className="px-2 py-1 bg-slate-700 text-slate-400 text-xs rounded">
                        Order: {feature.display_order}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditFeature(feature)}
                    className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteFeature(feature.id)}
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {features.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              No features yet. Add your first feature to get started!
            </div>
          )}
        </div>
      </div>

      {isFeatureModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">
                {editingFeature ? 'Edit Feature' : 'Add New Feature'}
              </h2>
              <button
                onClick={handleCloseFeatureModal}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleFeatureSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Feature Title *
                </label>
                <input
                  type="text"
                  value={featureForm.title}
                  onChange={(e) => setFeatureForm({ ...featureForm, title: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description *
                </label>
                <textarea
                  value={featureForm.description}
                  onChange={(e) => setFeatureForm({ ...featureForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Icon
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {availableIcons.map((icon) => {
                    const IconComponent = icon.component;
                    return (
                      <button
                        key={icon.name}
                        type="button"
                        onClick={() => setFeatureForm({ ...featureForm, icon_name: icon.name })}
                        className={`p-3 rounded-lg border-2 transition-colors ${
                          featureForm.icon_name === icon.name
                            ? 'border-primary-500 bg-primary-500/20'
                            : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                        }`}
                      >
                        <IconComponent className="w-5 h-5 text-white mx-auto" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Display Order
                </label>
                <input
                  type="number"
                  value={featureForm.display_order}
                  onChange={(e) => setFeatureForm({ ...featureForm, display_order: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featureForm.is_active}
                    onChange={(e) => setFeatureForm({ ...featureForm, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-300">Active</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  {loading ? 'Saving...' : 'Save Feature'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseFeatureModal}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
