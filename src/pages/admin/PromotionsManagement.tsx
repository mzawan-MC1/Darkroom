import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/currencyUtils';
import { Plus, Edit2, Trash2, Tag, Copy, CheckCircle } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type PromoCode = Database['public']['Tables']['promo_codes']['Row'];

export default function PromotionsManagement() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromoCodes((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching promo codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;

    try {
      const { error } = await supabase.from('promo_codes').delete().eq('id', id);
      if (error) throw error;
      fetchPromoCodes();
    } catch (error) {
      console.error('Error deleting promo code:', error);
      alert('Failed to delete promo code');
    }
  };

  const toggleStatus = async (promo: PromoCode) => {
    try {
      const { error } = await (supabase
        .from('promo_codes') as any)
        .update({ is_active: !promo.is_active })
        .eq('id', promo.id);

      if (error) throw error;
      fetchPromoCodes();
    } catch (error) {
      console.error('Error updating promo code:', error);
      alert('Failed to update promo code');
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
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
          <h3 className="text-xl font-bold text-white">Promotions & Promo Codes</h3>
          <p className="text-slate-300 mt-1">Create and manage promotional codes</p>
        </div>
        <button
          onClick={() => {
            setEditingPromo(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Promo Code
        </button>
      </div>

      {showForm && (
        <PromoCodeForm
          promo={editingPromo}
          onClose={() => {
            setShowForm(false);
            setEditingPromo(null);
            fetchPromoCodes();
          }}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {promoCodes.map((promo) => {
          const isExpired = promo.valid_until && new Date(promo.valid_until) < new Date();
          const isUsageLimitReached = promo.usage_limit && (promo.usage_count || 0) >= promo.usage_limit;

          return (
            <div
              key={promo.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <Tag className="w-6 h-6 text-primary-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-bold text-slate-900 font-mono">
                        {promo.code}
                      </h4>
                      <button
                        onClick={() => copyToClipboard(promo.code)}
                        className="p-1 hover:bg-slate-100 rounded transition-colors"
                        title="Copy code"
                      >
                        {copiedCode === promo.code ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>
                    {promo.description && (
                      <p className="text-sm text-slate-600 mt-1">{promo.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      promo.is_active && !isExpired && !isUsageLimitReached
                        ? 'bg-green-100 text-green-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {promo.is_active && !isExpired && !isUsageLimitReached
                      ? 'Active'
                      : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Discount:</span>
                  <span className="font-medium text-slate-900">
                    {promo.discount_type === 'percentage'
                      ? `${promo.discount_value}%`
                      : formatPrice(Number(promo.discount_value))}
                  </span>
                </div>

                {promo.min_purchase_amount !== null && promo.min_purchase_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Min Purchase:</span>
                    <span className="font-medium text-slate-900">
                      {formatPrice(Number(promo.min_purchase_amount))}
                    </span>
                  </div>
                )}

                {promo.max_discount_amount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Max Discount:</span>
                    <span className="font-medium text-slate-900">
                      {formatPrice(Number(promo.max_discount_amount))}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Usage:</span>
                  <span className="font-medium text-slate-900">
                    {promo.usage_count} / {promo.usage_limit || '∞'}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Valid From:</span>
                  <span className="font-medium text-slate-900">
                    {new Date(promo.valid_from || '').toLocaleDateString()}
                  </span>
                </div>

                {promo.valid_until && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Valid Until:</span>
                    <span
                      className={`font-medium ${
                        isExpired ? 'text-red-600' : 'text-slate-900'
                      }`}
                    >
                      {new Date(promo.valid_until).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {promo.applicable_to && promo.applicable_to.length > 0 && (
                  <div>
                    <span className="text-sm text-slate-600">Applicable to:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {promo.applicable_to.map((type) => (
                        <span
                          key={type}
                          className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded capitalize"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    setEditingPromo(promo);
                    setShowForm(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-orange-50 text-primary-500 hover:bg-orange-100 px-4 py-2 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => toggleStatus(promo)}
                  className="flex-1 bg-slate-50 text-slate-600 hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors"
                >
                  {promo.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleDelete(promo.id)}
                  className="flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {promoCodes.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Tag className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">No promo codes yet. Create your first promo code!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PromoCodeForm({
  promo,
  onClose,
}: {
  promo: PromoCode | null;
  onClose: () => void;
}) {
    const [formData, setFormData] = useState({
    code: promo?.code || '',
    description: promo?.description || '',
    discount_type: promo?.discount_type || 'percentage',
    discount_value: promo?.discount_value || 0,
    min_purchase_amount: promo?.min_purchase_amount || 0,
    max_discount_amount: promo?.max_discount_amount || null,
    usage_limit: promo?.usage_limit || null,
    valid_from: promo?.valid_from
      ? new Date(promo.valid_from).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    valid_until: promo?.valid_until
      ? new Date(promo.valid_until).toISOString().split('T')[0]
      : '',
    is_active: promo?.is_active !== false,
    applicable_to: promo?.applicable_to || ['booking', 'merchandise', 'pos'],
  });
  const [saving, setSaving] = useState(false);

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const dataToSave = {
        code: formData.code.toUpperCase(),
        description: formData.description,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        min_purchase_amount: formData.min_purchase_amount,
        max_discount_amount: formData.max_discount_amount,
        usage_limit: formData.usage_limit,
        valid_from: formData.valid_from,
        valid_until: formData.valid_until || null,
        is_active: formData.is_active,
        applicable_to: formData.applicable_to,
      };

      if (promo) {
        const { error } = await (supabase
          .from('promo_codes') as any)
          .update(dataToSave)
          .eq('id', promo.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('promo_codes') as any).insert(dataToSave);
        if (error) throw error;
      }

      onClose();
    } catch (error) {
      console.error('Error saving promo code:', error);
      alert('Failed to save promo code');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900">
            {promo ? 'Edit Promo Code' : 'Create Promo Code'}
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
            <label className="block text-sm font-medium text-slate-700 mb-2">Promo Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono"
                required
                placeholder="SUMMER2025"
              />
              <button
                type="button"
                onClick={generateCode}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              >
                Generate
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Summer discount for all bookings"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Discount Type
              </label>
              <select
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as any })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Discount Value
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.discount_value}
                onChange={(e) =>
                  setFormData({ ...formData, discount_value: parseFloat(e.target.value) })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Min Purchase (AED)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.min_purchase_amount}
                onChange={(e) =>
                  setFormData({ ...formData, min_purchase_amount: parseFloat(e.target.value) })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Max Discount (AED)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.max_discount_amount || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_discount_amount: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="No limit"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Usage Limit
            </label>
            <input
              type="number"
              value={formData.usage_limit || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  usage_limit: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Unlimited"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Valid From</label>
              <input
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Valid Until</label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Applicable To
            </label>
            <div className="space-y-2">
              {['booking', 'merchandise', 'pos'].map((type) => (
                <label key={type} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.applicable_to.includes(type)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          applicable_to: [...formData.applicable_to, type],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          applicable_to: formData.applicable_to.filter((t) => t !== type),
                        });
                      }
                    }}
                    className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-700 capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
              Active
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-primary-500 hover:bg-primary-600 text-white py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : promo ? 'Update Promo Code' : 'Create Promo Code'}
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
