import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, Edit2, Trash2, Eye, EyeOff, Star } from 'lucide-react';
import FileUpload from '../../../components/FileUpload';
import type { Database } from '../../../lib/database.types';
import AdminPagination from '../../../components/AdminPagination';

type BlogPost = Database['public']['Tables']['blog_posts']['Row'];

export default function BlogManagement() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchPosts();
  }, [currentPage, pageSize]);

  const fetchPosts = async () => {
    try {
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      setTotalItems(count || 0);
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return;

    try {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
      fetchPosts();
    } catch (error) {
      console.error('Error deleting blog post:', error);
      alert('Failed to delete blog post');
    }
  };

  const togglePublish = async (post: BlogPost) => {
    try {
      const updates: any = {
        is_published: !post.is_published,
        status: !post.is_published ? 'published' : 'draft',
      };

      if (!post.is_published) {
        updates.published_at = new Date().toISOString();
      }

      const { error } = await (supabase.from('blog_posts') as any).update(updates).eq('id', post.id);

      if (error) throw error;
      fetchPosts();
    } catch (error) {
      console.error('Error updating blog post:', error);
      alert('Failed to update blog post');
    }
  };

  const toggleFeatured = async (post: BlogPost) => {
    try {
      console.log('Toggling featured status for post:', post.id, 'Current:', post.featured, 'New:', !post.featured);

      const { data, error } = await (supabase
        .from('blog_posts') as any)
        .update({ featured: !post.featured })
        .eq('id', post.id)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        if (error.message.includes('Maximum of 3 blog posts')) {
          alert('Maximum of 3 blog posts can be featured. Please unfeature another post first.');
        } else {
          alert(`Failed to update featured status: ${error.message}`);
        }
        return;
      }

      console.log('Featured status updated successfully:', data);
      alert(`Post ${!post.featured ? 'added to' : 'removed from'} featured successfully!`);
      fetchPosts();
    } catch (error: any) {
      console.error('Error updating featured status:', error);
      alert(`Failed to update featured status: ${error?.message || 'Unknown error'}`);
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
          <h4 className="text-lg font-bold text-white">Blog Posts</h4>
          <p className="text-slate-300 text-sm mt-1">Create and manage SEO-optimized blog content</p>
        </div>
        <button
          onClick={() => {
            setEditingPost(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Post
        </button>
      </div>

      {showForm && (
        <BlogPostForm
          post={editingPost}
          onClose={() => {
            setShowForm(false);
            setEditingPost(null);
            fetchPosts();
          }}
        />
      )}

      <div className="space-y-4">
        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-lg font-bold text-slate-900">{post.title}</h4>
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      post.is_published
                        ? 'bg-green-100 text-green-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {post.status}
                  </span>
                  {post.featured && (
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-800" />
                      Featured
                    </span>
                  )}
                </div>
                {post.excerpt && (
                  <p className="text-slate-600 text-sm mb-3">{post.excerpt}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>Slug: /{post.slug}</span>
                  {post.published_at && (
                    <span>
                      Published: {new Date(post.published_at).toLocaleDateString()}
                    </span>
                  )}
                  {post.meta_keywords && post.meta_keywords.length > 0 && (
                    <span>Keywords: {post.meta_keywords.length}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => {
                    setEditingPost(post);
                    setShowForm(true);
                  }}
                  className="p-2 text-primary-500 hover:bg-orange-50 rounded transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => toggleFeatured(post)}
                  className={`p-2 rounded transition-colors ${
                    post.featured
                      ? 'text-yellow-600 hover:bg-yellow-50'
                      : 'text-slate-400 hover:bg-slate-50'
                  }`}
                  title={post.featured ? 'Remove from featured' : 'Add to featured'}
                >
                  <Star className={`w-5 h-5 ${post.featured ? 'fill-yellow-600' : ''}`} />
                </button>
                <button
                  onClick={() => togglePublish(post)}
                  className="p-2 text-slate-600 hover:bg-slate-50 rounded transition-colors"
                  title={post.is_published ? 'Unpublish' : 'Publish'}
                >
                  {post.is_published ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {posts.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <p className="text-slate-600">No blog posts yet. Create your first post!</p>
          </div>
        )}

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
    </div>
  );
}

function BlogPostForm({ post, onClose }: { post: BlogPost | null; onClose: () => void }) {
  const [formData, setFormData] = useState({
    title: post?.title || '',
    slug: post?.slug || '',
    excerpt: post?.excerpt || '',
    content: post?.content || '',
    featured_image: post?.featured_image || '',
    status: post?.status || 'draft',
    meta_title: post?.meta_title || '',
    meta_description: post?.meta_description || '',
    meta_keywords: post?.meta_keywords?.join(', ') || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const slug = formData.slug || formData.title.toLowerCase().replace(/\s+/g, '-');
      const keywords = formData.meta_keywords
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k);

      const sanitizeHtml = (html: string) => {
        if (!html) return '';
        // Remove script/style tags
        html = html.replace(/<\/(?:script|style)>/gi, '').replace(/<(?:script|style)[\s\S]*?<\/(?:script|style)>/gi, '');
        // Strip on* attributes and javascript: URLs
        html = html.replace(/ on[a-z]+="[^"]*"/gi, '');
        html = html.replace(/ href="javascript:[^"]*"/gi, '');
        // Allow basic tags only
        // const allowed = /(\/(?:p|br|strong|b|em|i|u|h1|h2|h3|ul|ol|li|a|blockquote))|(?:(?:p|br|strong|b|em|i|u|h1|h2|h3|ul|ol|li|a|blockquote)(?:\s+[^>]*)?)/i;
        // Simple fallback: remove angle-bracketed tags not in allowlist (best-effort)
        html = html.replace(/<([^>]+)>/g, (m) => {
          const tag = m.toLowerCase();
          if (tag.match(/^<\/?(p|br|strong|b|em|i|u|h1|h2|h3|ul|ol|li|a|blockquote)(\s|>)?/)) return m;
          return '';
        });
        return html;
      };

      const dataToSave: any = {
        ...formData,
        slug,
        meta_keywords: keywords,
        content: sanitizeHtml(formData.content),
        is_published: formData.status === 'published',
        published_at: formData.status === 'published' ? new Date().toISOString() : null,
      };

      if (post) {
        const { error } = await (supabase.from('blog_posts') as any).update(dataToSave).eq('id', post.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('blog_posts') as any).insert(dataToSave);
        if (error) throw error;
      }

      onClose();
    } catch (error) {
      console.error('Error saving blog post:', error);
      alert('Failed to save blog post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900">
            {post ? 'Edit Blog Post' : 'New Blog Post'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              placeholder="auto-generated-from-title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Excerpt</label>
            <textarea
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Brief summary of the post"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Content</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={10}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
              placeholder="Full blog post content..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Featured Image</label>
            <FileUpload
              currentImageUrl={formData.featured_image}
              folder="blog"
              accept="image/*"
              onUploadComplete={(url) => setFormData({ ...formData, featured_image: url })}
            />
            <p className="text-xs text-slate-500 mt-1">Upload a blog cover image (JPG/PNG/GIF). Stored in Supabase Storage.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
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
                  placeholder="SEO title for search engines"
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
                  placeholder="SEO description for search engines"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.meta_keywords}
                  onChange={(e) => setFormData({ ...formData, meta_keywords: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="escape room, dubai, adventure, puzzle"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-primary-500 hover:bg-primary-600 text-white py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : post ? 'Update Post' : 'Create Post'}
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


