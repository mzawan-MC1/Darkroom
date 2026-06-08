import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, ChevronUp, ChevronDown, X } from 'lucide-react';

interface Achievement {
  id: string;
  title: string;
  short_description: string | null;
  style_tag: 'vikings' | 'pirates' | 'neutral' | 'horror' | 'adventurer' | 'sinner' | 'achiever' | 'reacher' | 'struggler' | 'dracula' | 'gamer' | 'sleeper' | 'dangerous' | null;
  is_active: boolean;
  sort_order: number;
}

interface GameAchievementsManagerProps {
  gameId: string;
  onUpdate?: () => void;
}

const getStyleTagColor = (tag: string) => {
  const colors: Record<string, string> = {
    vikings: 'bg-blue-100 text-blue-700',
    pirates: 'bg-purple-100 text-purple-700',
    horror: 'bg-red-100 text-red-700',
    adventurer: 'bg-green-100 text-green-700',
    sinner: 'bg-pink-100 text-pink-700',
    achiever: 'bg-yellow-100 text-yellow-700',
    reacher: 'bg-cyan-100 text-cyan-700',
    struggler: 'bg-orange-100 text-orange-700',
    dracula: 'bg-red-200 text-red-900',
    gamer: 'bg-indigo-100 text-indigo-700',
    sleeper: 'bg-slate-200 text-slate-700',
    dangerous: 'bg-rose-100 text-rose-700',
    neutral: 'bg-gray-100 text-gray-700',
  };
  return colors[tag] || colors.neutral;
};

export default function GameAchievementsManager({ gameId, onUpdate }: GameAchievementsManagerProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    short_description: string;
    style_tag: string;
    is_active: boolean;
  }>({
    title: '',
    short_description: '',
    style_tag: 'neutral',
    is_active: true,
  });

  useEffect(() => {
    loadAchievements();
  }, [gameId]);

  const loadAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from('game_achievements')
        .select('*')
        .eq('game_id', gameId)
        .order('sort_order');

      if (error) throw error;
      setAchievements(data || []);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.title.trim()) return;

    try {
      const maxOrder = achievements.length > 0
        ? Math.max(...achievements.map(a => a.sort_order))
        : 0;

      const { error } = await (supabase
        .from('game_achievements') as any)
        .insert({
          game_id: gameId,
          title: formData.title,
          short_description: formData.short_description || null,
          style_tag: formData.style_tag,
          is_active: formData.is_active,
          sort_order: maxOrder + 1,
        });

      if (error) throw error;

      setFormData({
        title: '',
        short_description: '',
        style_tag: 'neutral',
        is_active: true,
      });

      await loadAchievements();
      onUpdate?.();
    } catch (error) {
      console.error('Error adding achievement:', error);
      alert('Failed to add achievement');
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Achievement>) => {
    try {
      const { error } = await (supabase
        .from('game_achievements') as any)
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await loadAchievements();
      setEditingId(null);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating achievement:', error);
      alert('Failed to update achievement');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this achievement?')) return;

    try {
      const { error } = await (supabase
        .from('game_achievements') as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadAchievements();
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting achievement:', error);
      alert('Failed to delete achievement');
    }
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = achievements.findIndex(a => a.id === id);
    if (currentIndex === -1) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === achievements.length - 1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const newAchievements = [...achievements];
    [newAchievements[currentIndex], newAchievements[newIndex]] =
      [newAchievements[newIndex], newAchievements[currentIndex]];

    try {
      const updates = newAchievements.map((achievement, index) => ({
        id: achievement.id,
        sort_order: index,
      }));

      for (const update of updates) {
        await (supabase
          .from('game_achievements') as any)
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
      }

      await loadAchievements();
      onUpdate?.();
    } catch (error) {
      console.error('Error reordering achievements:', error);
      alert('Failed to reorder achievements');
    }
  };

  const handleSeedDefaults = async () => {
    if (!confirm('Add default achievements? This will add 8 preset achievements.')) return;

    try {
      const { error } = await (supabase.rpc as any)('seed_default_achievements', {
        p_game_id: gameId,
      });

      if (error) throw error;

      await loadAchievements();
      onUpdate?.();
      alert('Default achievements added successfully!');
    } catch (error) {
      console.error('Error seeding achievements:', error);
      alert('Failed to add default achievements');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading achievements...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Game Achievements</h3>
        {achievements.length === 0 && (
          <button
            onClick={handleSeedDefaults}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Add Default Achievements
          </button>
        )}
      </div>

      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <h4 className="font-medium text-gray-900">Add New Achievement</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Raider of Runes"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Short Description (max 10 words)
            </label>
            <input
              type="text"
              value={formData.short_description}
              onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
              placeholder="e.g., Solved 3+ clues without hints"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Style Tag
            </label>
            <select
              value={formData.style_tag}
              onChange={(e) => setFormData({ ...formData, style_tag: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="neutral">Neutral</option>
              <option value="vikings">Vikings</option>
              <option value="pirates">Pirates</option>
              <option value="horror">Horror</option>
              <option value="adventurer">Adventurer</option>
              <option value="sinner">Sinner</option>
              <option value="achiever">Achiever</option>
              <option value="reacher">Reacher</option>
              <option value="struggler">Struggler</option>
              <option value="dracula">Dracula</option>
              <option value="gamer">Gamer</option>
              <option value="sleeper">Sleeper</option>
              <option value="dangerous">Dangerous</option>
            </select>
          </div>
          <div className="flex items-center">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={!formData.title.trim()}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          <span>Add Achievement</span>
        </button>
      </div>

      {achievements.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Existing Achievements ({achievements.length})</h4>
          {achievements.map((achievement, index) => (
            <div
              key={achievement.id}
              className={`bg-white border ${achievement.is_active ? 'border-gray-200' : 'border-gray-300 bg-gray-50'} rounded-lg p-4`}
            >
              {editingId === achievement.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    defaultValue={achievement.title}
                    onBlur={(e) => handleUpdate(achievement.id, { title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h5 className={`font-medium ${achievement.is_active ? 'text-gray-900' : 'text-gray-500'}`}>
                        {achievement.title}
                      </h5>
                      {achievement.style_tag && (
                        <span className={`px-2 py-1 text-xs rounded-full ${getStyleTagColor(achievement.style_tag)}`}>
                          {achievement.style_tag}
                        </span>
                      )}
                      {!achievement.is_active && (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
                          Inactive
                        </span>
                      )}
                    </div>
                    {achievement.short_description && (
                      <p className="text-sm text-gray-600 mt-1">{achievement.short_description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleMove(achievement.id, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <ChevronUp className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleMove(achievement.id, 'down')}
                      disabled={index === achievements.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <ChevronDown className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleUpdate(achievement.id, { is_active: !achievement.is_active })}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                    >
                      {achievement.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(achievement.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
