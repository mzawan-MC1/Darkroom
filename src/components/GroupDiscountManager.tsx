import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, Save, X, Percent } from 'lucide-react';

interface PricingTier {
  id: string;
  game_id: string | null;
  min_participants: number;
  max_participants: number;
  discount_percentage: number;
  is_active: boolean;
}

interface GroupDiscountManagerProps {
  gameId: string | null;
  gameName?: string;
}

export default function GroupDiscountManager({ gameId, gameName }: GroupDiscountManagerProps) {
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTier, setEditingTier] = useState<PricingTier | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    min_participants: 3,
    max_participants: 4,
    discount_percentage: 10,
  });

  useEffect(() => {
    fetchTiers();
  }, [gameId]);

  const fetchTiers = async () => {
    try {
      let query = supabase
        .from('pricing_tiers')
        .select('*')
        .order('min_participants');

      if (gameId) {
        query = query.eq('game_id', gameId);
      } else {
        query = query.is('game_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTiers(data || []);
    } catch (error) {
      console.error('Error fetching pricing tiers:', error);
      alert('Error loading discount tiers');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (tier?: PricingTier) => {
    if (tier) {
      setEditingTier(tier);
      setFormData({
        min_participants: tier.min_participants,
        max_participants: tier.max_participants,
        discount_percentage: Number(tier.discount_percentage),
      });
    } else {
      setEditingTier(null);
      setFormData({
        min_participants: 3,
        max_participants: 4,
        discount_percentage: 10,
      });
    }
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.min_participants > formData.max_participants) {
      alert('Minimum participants must be less than or equal to maximum participants');
      return;
    }

    if (formData.discount_percentage < 0 || formData.discount_percentage > 100) {
      alert('Discount percentage must be between 0 and 100');
      return;
    }

    try {
      if (editingTier) {
        const { error } = await (supabase
          .from('pricing_tiers') as any)
          .update({
            min_participants: formData.min_participants,
            max_participants: formData.max_participants,
            discount_percentage: formData.discount_percentage,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTier.id);

        if (error) throw error;
        alert('Discount tier updated successfully!');
      } else {
        const { error } = await (supabase
          .from('pricing_tiers') as any)
          .insert([{
            game_id: gameId,
            min_participants: formData.min_participants,
            max_participants: formData.max_participants,
            discount_percentage: formData.discount_percentage,
            is_active: true,
          }]);

        if (error) throw error;
        alert('Discount tier created successfully!');
      }

      setShowForm(false);
      fetchTiers();
    } catch (error: any) {
      console.error('Error saving tier:', error);
      alert(error.message || 'Error saving discount tier');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discount tier?')) return;

    try {
      const { error } = await (supabase
        .from('pricing_tiers') as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Discount tier deleted successfully!');
      fetchTiers();
    } catch (error) {
      console.error('Error deleting tier:', error);
      alert('Error deleting discount tier');
    }
  };

  const toggleActive = async (tier: PricingTier) => {
    try {
      const { error } = await (supabase
        .from('pricing_tiers') as any)
        .update({ is_active: !tier.is_active })
        .eq('id', tier.id);

      if (error) throw error;
      fetchTiers();
    } catch (error) {
      console.error('Error toggling tier status:', error);
      alert('Error updating tier status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-slate-900">
            Group Discounts {gameName && `for ${gameName}`}
          </h4>
          <p className="text-sm text-slate-600">
            {gameId ? 'Game-specific' : 'Default'} discount tiers based on number of participants
          </p>
        </div>
        <button
          onClick={() => handleOpenForm()}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Tier
        </button>
      </div>

      {tiers.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
          <Percent className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">No discount tiers configured</p>
          <p className="text-sm text-slate-500 mt-1">Add tiers to provide group discounts</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Participants Range
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Discount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {tiers.map((tier) => (
                <tr key={tier.id} className={tier.is_active ? '' : 'opacity-50'}>
                  <td className="px-4 py-3 text-sm text-slate-900">
                    {tier.min_participants} - {tier.max_participants} players
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-700">
                      <Percent className="w-4 h-4" />
                      {tier.discount_percentage}% off
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(tier)}
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        tier.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {tier.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenForm(tier)}
                        className="p-2 text-primary-500 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tier.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">
                  {editingTier ? 'Edit' : 'Add'} Discount Tier
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Min Participants
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.min_participants}
                    onChange={(e) => setFormData({ ...formData, min_participants: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Max Participants
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.max_participants}
                    onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Discount Percentage
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    required
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Enter a value between 0 and 100
                </p>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm text-orange-800">
                  <strong>Example:</strong> If base price is AED 100/player and you set 10% discount for 3-4 players,
                  a group of 4 will pay AED 360 instead of AED 400 (AED 40 discount).
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {editingTier ? 'Update' : 'Create'} Tier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
