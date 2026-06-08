import { useState, useEffect } from 'react';
import { Search, Globe, FileText, Save, Loader2, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import FileUpload from '../../components/FileUpload';

interface PageSEO {
  id: string;
  page_identifier: string;
  meta_title: string;
  meta_description: string;
  keywords: string;
  canonical_url: string;
  robots: string;
  og_title: string;
  og_description: string;
  og_image_url: string;
  is_active: boolean;
  priority: number;
  change_frequency: string;
}

const PAGES = [
  { id: 'home', label: 'Home', path: '/' },
  { id: 'games', label: 'Games', path: '/games' },
  { id: 'lobby-games', label: 'Lobby Games', path: '/lobby-games' },
  { id: 'merchandise', label: 'Merchandise', path: '/merchandise' },
  { id: 'about', label: 'About Us', path: '/about' },
  { id: 'contact', label: 'Contact Us', path: '/contact' },
];

const ROBOTS_OPTIONS = [
  'index, follow',
  'index, nofollow',
  'noindex, follow',
  'noindex, nofollow',
];

export default function SEOSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingSitemap, setGeneratingSitemap] = useState(false);
  const [selectedPage, setSelectedPage] = useState('home');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [seoData, setSeoData] = useState<Record<string, PageSEO>>({});

  const [formData, setFormData] = useState<Omit<PageSEO, 'id'>>({
    page_identifier: 'home',
    meta_title: '',
    meta_description: '',
    keywords: '',
    canonical_url: '',
    robots: 'index, follow',
    og_title: '',
    og_description: '',
    og_image_url: '',
    is_active: true,
    priority: 0.8,
    change_frequency: 'weekly',
  });

  useEffect(() => {
    loadSEOData();
  }, []);

  useEffect(() => {
    if (seoData[selectedPage]) {
      const data = seoData[selectedPage];
      setFormData({
        page_identifier: data.page_identifier,
        meta_title: data.meta_title || '',
        meta_description: data.meta_description || '',
        keywords: data.keywords || '',
        canonical_url: data.canonical_url || '',
        robots: data.robots || 'index, follow',
        og_title: data.og_title || '',
        og_description: data.og_description || '',
        og_image_url: data.og_image_url || '',
        is_active: data.is_active ?? true,
        priority: data.priority || 0.8,
        change_frequency: data.change_frequency || 'weekly',
      });
    }
  }, [selectedPage, seoData]);

  const loadSEOData = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase
        .from('page_seo') as any)
        .select('*');

      if (error) throw error;

      const seoMap: Record<string, PageSEO> = {};
      data?.forEach((item: any) => {
        seoMap[item.page_identifier] = item;
      });
      setSeoData(seoMap);
    } catch (error) {
      console.error('Error loading SEO data:', error);
      setMessage({ type: 'error', text: 'Failed to load SEO data' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const { error } = await (supabase
        .from('page_seo') as any)
        .upsert(
          {
            ...formData,
            page_identifier: selectedPage,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'page_identifier',
          }
        );

      if (error) throw error;

      await loadSEOData();
      setMessage({ type: 'success', text: 'SEO settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving SEO data:', error);
      setMessage({ type: 'error', text: 'Failed to save SEO settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateSitemap = async () => {
    try {
      setGeneratingSitemap(true);
      setMessage(null);

      const { data, error } = await (supabase
        .from('page_seo') as any)
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      const baseUrl = window.location.origin;
      let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
      sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

      data?.forEach((page: any) => {
        sitemap += '  <url>\n';
        sitemap += `    <loc>${baseUrl}${page.canonical_url || page.path}</loc>\n`;
        sitemap += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
        sitemap += `    <changefreq>${page.change_frequency || 'weekly'}</changefreq>\n`;
        sitemap += `    <priority>${page.priority || 0.8}</priority>\n`;
        sitemap += '  </url>\n';
      });

      // Add Games
      const { data: games } = await (supabase.from('games') as any).select('slug, updated_at').eq('status', 'active');
      games?.forEach((game: any) => {
        sitemap += '  <url>\n';
        sitemap += `    <loc>${baseUrl}/game/${game.slug}</loc>\n`;
        sitemap += `    <lastmod>${(game.updated_at || new Date().toISOString()).split('T')[0]}</lastmod>\n`;
        sitemap += `    <changefreq>weekly</changefreq>\n`;
        sitemap += `    <priority>0.9</priority>\n`;
        sitemap += '  </url>\n';
      });

      // Add Lobby Games
      const { data: lobbyGames } = await (supabase.from('lobby_games') as any).select('slug, updated_at').eq('status', 'active');
      lobbyGames?.forEach((game: any) => {
        sitemap += '  <url>\n';
        sitemap += `    <loc>${baseUrl}/lobby-game/${game.slug}</loc>\n`;
        sitemap += `    <lastmod>${(game.updated_at || new Date().toISOString()).split('T')[0]}</lastmod>\n`;
        sitemap += `    <changefreq>weekly</changefreq>\n`;
        sitemap += `    <priority>0.8</priority>\n`;
        sitemap += '  </url>\n';
      });

      // Add Blog Posts
      const { data: blogs } = await (supabase.from('blog_posts') as any).select('slug, updated_at').eq('is_published', true);
      blogs?.forEach((blog: any) => {
        sitemap += '  <url>\n';
        sitemap += `    <loc>${baseUrl}/blog/${blog.slug}</loc>\n`;
        sitemap += `    <lastmod>${(blog.updated_at || new Date().toISOString()).split('T')[0]}</lastmod>\n`;
        sitemap += `    <changefreq>monthly</changefreq>\n`;
        sitemap += `    <priority>0.7</priority>\n`;
        sitemap += '  </url>\n';
      });

      sitemap += '</urlset>';

      const blob = new Blob([sitemap], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sitemap.xml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Sitemap generated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error generating sitemap:', error);
      setMessage({ type: 'error', text: 'Failed to generate sitemap' });
    } finally {
      setGeneratingSitemap(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getCharacterCount = (text: string, max: number) => {
    const count = text.length;
    const color = count > max ? 'text-red-600' : count > max * 0.8 ? 'text-amber-600' : 'text-slate-500';
    return <span className={`text-xs ${color}`}>Optimal: {max > 100 ? `${max - 10}-${max}` : `50-${max}`} characters ({count}/{max})</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Page List */}
      <div className="w-64 bg-slate-900 border-r border-red-900/30 p-4">
        <h2 className="text-lg font-semibold text-white mb-4">Pages</h2>
        <div className="space-y-1">
          {PAGES.map((page) => (
            <button
              key={page.id}
              onClick={() => setSelectedPage(page.id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                selectedPage === page.id
                  ? 'bg-primary-500/20 text-primary-400 font-medium border border-primary-500/30'
                  : 'text-slate-400 hover:bg-black/30 hover:border-red-900/30 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>{page.label}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">{page.path}</div>
            </button>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-red-900/30">
          <button
            onClick={handleGenerateSitemap}
            disabled={generatingSitemap}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generatingSitemap ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Generate Sitemap
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Content - SEO Form */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-3xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">SEO Settings</h1>
            <p className="text-slate-300">
              Manage SEO metadata for {PAGES.find(p => p.id === selectedPage)?.label}
            </p>
          </div>

          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="space-y-6">
            {/* Basic SEO Section */}
            <div className="bg-black/50 rounded-xl shadow-sm border border-red-900/30 p-6 hover:border-primary-500/50 hover:shadow-primary-500/20 transition-all">
              <div className="flex items-center gap-2 mb-6">
                <Search className="w-5 h-5 text-primary-500" />
                <h2 className="text-xl font-semibold text-white">Basic SEO</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Meta Title ({formData.meta_title.length}/60)
                  </label>
                  <input
                    type="text"
                    value={formData.meta_title}
                    onChange={(e) => handleChange('meta_title', e.target.value)}
                    maxLength={60}
                    className="w-full px-4 py-2 bg-slate-900 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white placeholder-slate-500"
                    placeholder="Page Title - Brand Name"
                  />
                  {getCharacterCount(formData.meta_title, 60)}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Meta Description ({formData.meta_description.length}/160)
                  </label>
                  <textarea
                    value={formData.meta_description}
                    onChange={(e) => handleChange('meta_description', e.target.value)}
                    maxLength={160}
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-900 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white placeholder-slate-500"
                    placeholder="Brief description of the page content"
                  />
                  {getCharacterCount(formData.meta_description, 160)}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Keywords (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.keywords}
                    onChange={(e) => handleChange('keywords', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white placeholder-slate-500"
                    placeholder="keyword1, keyword2, keyword3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Canonical URL
                  </label>
                  <input
                    type="text"
                    value={formData.canonical_url}
                    onChange={(e) => handleChange('canonical_url', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white placeholder-slate-500"
                    placeholder="https://example.com/page"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Robots
                  </label>
                  <select
                    value={formData.robots}
                    onChange={(e) => handleChange('robots', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white"
                  >
                    {ROBOTS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Social Media (Open Graph) Section */}
            <div className="bg-black/50 rounded-xl shadow-sm border border-red-900/30 p-6 hover:border-primary-500/50 hover:shadow-primary-500/20 transition-all">
              <div className="flex items-center gap-2 mb-6">
                <Globe className="w-5 h-5 text-primary-500" />
                <h2 className="text-xl font-semibold text-white">Social Media (Open Graph)</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    OG Title
                  </label>
                  <input
                    type="text"
                    value={formData.og_title}
                    onChange={(e) => handleChange('og_title', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white placeholder-slate-500"
                    placeholder="Title for social media sharing"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    OG Description
                  </label>
                  <textarea
                    value={formData.og_description}
                    onChange={(e) => handleChange('og_description', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-900 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white placeholder-slate-500"
                    placeholder="Description for social media sharing"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    OG Image
                  </label>
                  <FileUpload
                    currentImageUrl={formData.og_image_url}
                    onUploadComplete={(url) => handleChange('og_image_url', url)}
                    folder="seo"
                    accept="image/*"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Recommended: 1200x630px
                  </p>
                </div>
              </div>
            </div>

            {/* Sitemap Settings */}
            <div className="bg-black/50 rounded-xl shadow-sm border border-red-900/30 p-6 hover:border-primary-500/50 hover:shadow-primary-500/20 transition-all">
              <div className="flex items-center gap-2 mb-6">
                <FileText className="w-5 h-5 text-primary-500" />
                <h2 className="text-xl font-semibold text-white">Sitemap Settings</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => handleChange('is_active', e.target.checked)}
                    className="w-4 h-4 text-primary-500 border-red-900/30 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm font-medium text-slate-400">
                    Include in sitemap
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Priority (0.0 - 1.0)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.priority}
                    onChange={(e) => handleChange('priority', parseFloat(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-900 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Change Frequency
                  </label>
                  <select
                    value={formData.change_frequency}
                    onChange={(e) => handleChange('change_frequency', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white"
                  >
                    <option value="always">Always</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="never">Never</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save SEO Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
