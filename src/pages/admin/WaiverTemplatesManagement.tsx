import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, FileText, Edit2, Trash2, X, CheckCircle, XCircle } from 'lucide-react';

interface WaiverTemplate {
  id: string;
  title: string;
  content: string;
  version: string;
  is_active: boolean;
  is_required: boolean;
  applies_to: string[];
  game_ids: string[];
  created_at: string;
  updated_at: string;
}

export default function WaiverTemplatesManagement() {
  const [waiverTemplates, setWaiverTemplates] = useState<WaiverTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWaiver, setEditingWaiver] = useState<WaiverTemplate | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    version: '1.0',
    is_active: false,
    is_required: true,
  });

  useEffect(() => {
    fetchWaiverTemplates();
  }, []);

  const fetchWaiverTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('waiver_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWaiverTemplates(data || []);
    } catch (error) {
      console.error('Error fetching waiver templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (waiver?: WaiverTemplate) => {
    if (waiver) {
      setEditingWaiver(waiver);
      setFormData({
        title: waiver.title,
        content: waiver.content,
        version: waiver.version,
        is_active: waiver.is_active,
        is_required: waiver.is_required,
      });
    } else {
      setEditingWaiver(null);
      setFormData({
        title: '',
        content: '',
        version: '1.0',
        is_active: false,
        is_required: true,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const waiverData = {
        title: formData.title,
        content: formData.content,
        version: formData.version,
        is_active: formData.is_active,
        is_required: formData.is_required,
        updated_at: new Date().toISOString(),
      };

      if (editingWaiver) {
        const { error } = await (supabase
          .from('waiver_templates') as any)
          .update(waiverData)
          .eq('id', editingWaiver.id);

        if (error) throw error;
        alert('Waiver template updated successfully!');
      } else {
        const { error } = await (supabase
          .from('waiver_templates') as any)
          .insert([waiverData]);

        if (error) throw error;
        alert('Waiver template created successfully!');
      }

      setShowModal(false);
      fetchWaiverTemplates();
    } catch (error: any) {
      console.error('Error saving waiver template:', error);
      alert(error.message || 'Failed to save waiver template');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this waiver template?')) return;

    try {
      const { error } = await supabase
        .from('waiver_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Waiver template deleted successfully!');
      fetchWaiverTemplates();
    } catch (error: any) {
      console.error('Error deleting waiver template:', error);
      alert(error.message || 'Failed to delete waiver template');
    }
  };

  const handleToggleActive = async (waiver: WaiverTemplate) => {
    try {
      const { error } = await (supabase
        .from('waiver_templates') as any)
        .update({ is_active: !waiver.is_active })
        .eq('id', waiver.id);

      if (error) throw error;
      fetchWaiverTemplates();
    } catch (error: any) {
      console.error('Error toggling waiver status:', error);
      alert(error.message || 'Failed to update waiver status');
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Waiver Templates</h1>
          <p className="text-slate-300 mt-1">Create and manage waiver templates</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add New Waiver
        </button>
      </div>

      {waiverTemplates.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 mb-4">No waiver templates found</p>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Your First Waiver
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {waiverTemplates.map((waiver) => (
            <div
              key={waiver.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-slate-900">{waiver.title}</h3>
                    <span className="px-2 py-1 text-xs rounded bg-slate-100 text-slate-700">
                      v{waiver.version}
                    </span>
                    {waiver.is_active ? (
                      <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        Inactive
                      </span>
                    )}
                    {waiver.is_required && (
                      <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">
                    Created: {new Date(waiver.created_at).toLocaleDateString()} |
                    Updated: {new Date(waiver.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleActive(waiver)}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      waiver.is_active
                        ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {waiver.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleOpenModal(waiver)}
                    className="p-2 text-primary-500 hover:bg-orange-50 rounded transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(waiver.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">
                  {waiver.content.substring(0, 500)}
                  {waiver.content.length > 500 && '...'}
                </pre>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingWaiver ? 'Edit Waiver Template' : 'Create New Waiver Template'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Version
                  </label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Waiver Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={15}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                  placeholder="Enter waiver content here..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  You can use Markdown formatting for better presentation
                </p>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Set as Active</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_required}
                    onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                    className="w-4 h-4 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Required</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  {editingWaiver ? 'Update Waiver' : 'Create Waiver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
