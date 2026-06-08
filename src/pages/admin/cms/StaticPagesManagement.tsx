import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, Edit2, Eye, EyeOff } from 'lucide-react';
import type { Database } from '../../../lib/database.types';
import AdminPagination from '../../../components/AdminPagination';

type StaticPage = Database['public']['Tables']['static_pages']['Row'];

const DEFAULT_PAGES = [
  { slug: 'about', title: 'About Us', page_type: 'about' },
  { slug: 'faq', title: 'FAQ', page_type: 'faq' },
  { slug: 'safety-rules', title: 'Safety Rules', page_type: 'safety' },
  { slug: 'contact', title: 'Contact', page_type: 'contact' },
  { slug: 'waiver-policy', title: 'Waiver Policy', page_type: 'waiver' },
  { slug: 'privacy-policy', title: 'Privacy Policy', page_type: 'privacy' },
  { slug: 'terms-and-conditions', title: 'Terms & Conditions', page_type: 'terms' },
];

export default function StaticPagesManagement() {
  const [pages, setPages] = useState<StaticPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPage, setEditingPage] = useState<StaticPage | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchPages();
  }, [currentPage, pageSize]);

  const fetchPages = async () => {
    try {
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('static_pages')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      setTotalItems(count || 0);
      setPages(data || []);
    } catch (error) {
      console.error('Error fetching static pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePublish = async (page: StaticPage) => {
    try {
      const { error } = await (supabase
        .from('static_pages') as any)
        .update({ is_published: !page.is_published })
        .eq('id', page.id);

      if (error) throw error;
      fetchPages();
    } catch (error) {
      console.error('Error updating static page:', error);
      alert('Failed to update static page');
    }
  };

  const createDefaultPages = async () => {
    try {
      const { error } = await (supabase.from('static_pages') as any).insert(
        DEFAULT_PAGES.map((page) => ({
          ...page,
          content: `<h1>${page.title}</h1><p>Add your content here...</p>`,
          is_published: false,
        }))
      );

      if (error) throw error;
      fetchPages();
    } catch (error) {
      console.error('Error creating default pages:', error);
      alert('Failed to create default pages');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h4 className="text-lg font-bold text-white">Static Pages</h4>
          <p className="text-slate-300 text-sm mt-1">Manage static content pages</p>
        </div>
        <div className="flex gap-2">
          {pages.length === 0 && (
            <button
              onClick={createDefaultPages}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Create Default Pages
            </button>
          )}
          <button
            onClick={() => {
              setEditingPage(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Page
          </button>
        </div>
      </div>

      {showForm && (
        <StaticPageForm
          page={editingPage}
          onClose={() => {
            setShowForm(false);
            setEditingPage(null);
            fetchPages();
          }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pages.map((page) => (
          <div
            key={page.id}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="text-lg font-bold text-slate-900">{page.title}</h4>
                <p className="text-sm text-slate-500 font-mono mt-1">/{page.slug}</p>
                {page.page_type && (
                  <span className="inline-block px-2 py-1 mt-2 text-xs bg-slate-100 text-slate-700 rounded capitalize">
                    {page.page_type}
                  </span>
                )}
              </div>
              <span
                className={`px-3 py-1 text-xs font-semibold rounded-full ${
                  page.is_published
                    ? 'bg-green-100 text-green-800'
                    : 'bg-slate-100 text-slate-800'
                }`}
              >
                {page.is_published ? 'Published' : 'Draft'}
              </span>
            </div>

            <div className="flex gap-2 pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setEditingPage(page);
                  setShowForm(true);
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-orange-50 text-primary-500 hover:bg-orange-100 px-4 py-2 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => togglePublish(page)}
                className="flex items-center justify-center bg-slate-50 text-slate-600 hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors"
                title={page.is_published ? 'Unpublish' : 'Publish'}
              >
                {page.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}

        {pages.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-slate-200">
            <p className="text-slate-600 mb-4">No static pages yet.</p>
            <button
              onClick={createDefaultPages}
              className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
            >
              Create Default Pages
            </button>
          </div>
        )}
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
  );
}

function StaticPageForm({ page, onClose }: { page: StaticPage | null; onClose: () => void }) {
  const [formData, setFormData] = useState({
    title: page?.title || '',
    slug: page?.slug || '',
    content: page?.content || '',
    page_type: page?.page_type || '',
    meta_title: page?.meta_title || '',
    meta_description: page?.meta_description || '',
    schema_markup: JSON.stringify(page?.schema_markup || {}, null, 2),
    is_published: page?.is_published !== false,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const slug = formData.slug || formData.title.toLowerCase().replace(/\s+/g, '-');
      let schemaMarkup = {};

      try {
        schemaMarkup = JSON.parse(formData.schema_markup);
      } catch (e) {
        console.warn('Invalid JSON for schema markup');
      }

      const dataToSave: any = {
        ...formData,
        slug,
        schema_markup: schemaMarkup,
      };

      if (page) {
        const { error } = await (supabase.from('static_pages') as any).update(dataToSave).eq('id', page.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('static_pages') as any).insert(dataToSave);
        if (error) throw error;
      }

      onClose();
    } catch (error) {
      console.error('Error saving static page:', error);
      alert('Failed to save static page');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900">
            {page ? 'Edit Static Page' : 'New Static Page'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                placeholder="auto-generated"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Page Type</label>
            <input
              type="text"
              value={formData.page_type}
              onChange={(e) => setFormData({ ...formData, page_type: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="about, faq, contact, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Content</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={12}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
              placeholder="HTML content..."
            />
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-sm font-bold text-slate-900 mb-3">SEO Settings</h4>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Meta Title
                </label>
                <input
                  type="text"
                  value={formData.meta_title}
                  onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Meta Description
                </label>
                <textarea
                  value={formData.meta_description}
                  onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Schema Markup (JSON)
                </label>
                <textarea
                  value={formData.schema_markup}
                  onChange={(e) => setFormData({ ...formData, schema_markup: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                  placeholder='{"@context": "https://schema.org", "@type": "Organization"}'
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_published"
              checked={formData.is_published}
              onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
              className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
            />
            <label htmlFor="is_published" className="text-sm font-medium text-slate-700">
              Published
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-primary-500 hover:bg-primary-600 text-white py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : page ? 'Update Page' : 'Create Page'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
