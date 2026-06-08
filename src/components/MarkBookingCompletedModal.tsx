import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Trophy, Clock } from 'lucide-react';

interface Achievement {
  id: string;
  title: string;
  short_description: string | null;
  style_tag: 'vikings' | 'pirates' | 'neutral' | 'horror' | 'adventurer' | 'sinner' | 'achiever' | 'reacher' | 'struggler' | 'dracula' | 'gamer' | 'sleeper' | 'dangerous' | null;
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

interface MarkBookingCompletedModalProps {
  bookingId: string;
  gameId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MarkBookingCompletedModal({
  bookingId,
  gameId,
  isOpen,
  onClose,
  onSuccess,
}: MarkBookingCompletedModalProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedAchievementIds, setSelectedAchievementIds] = useState<Set<string>>(new Set());
  const [timeToFinish, setTimeToFinish] = useState('60');
  const [achievementNote, setAchievementNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen && gameId) {
      loadAchievements();
    }
  }, [isOpen, gameId]);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      console.log('Loading achievements for game:', gameId);

      const { data, error } = await supabase
        .from('game_achievements')
        .select('*')
        .eq('game_id', gameId)
        .eq('is_active', true)
        .order('sort_order');

      console.log('Achievements query result:', { data, error });

      if (error) throw error;
      setAchievements(data || []);
    } catch (error: any) {
      console.error('Error loading achievements:', error);
      setErrorMessage(error.message || 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAchievement = (achievementId: string) => {
    const newSelection = new Set(selectedAchievementIds);
    if (newSelection.has(achievementId)) {
      newSelection.delete(achievementId);
    } else {
      newSelection.add(achievementId);
    }
    setSelectedAchievementIds(newSelection);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!timeToFinish || parseInt(timeToFinish) <= 0) {
      alert('Please enter a valid time to finish');
      return;
    }

    if (selectedAchievementIds.size === 0) {
      alert('Please select at least one achievement');
      return;
    }

    try {
      setSubmitting(true);

      const { error: updateError } = await (supabase
        .from('bookings') as any)
        .update({
          booking_status: 'completed',
          completed_at: new Date().toISOString(),
          time_to_finish_minutes: parseInt(timeToFinish),
          achievement_note: achievementNote || null,
        })
        .eq('id', bookingId);

      if (updateError) throw updateError;

      const achievementInserts = Array.from(selectedAchievementIds).map(achievementId => ({
        booking_id: bookingId,
        achievement_id: achievementId,
      }));

      const { error: achievementsError } = await (supabase
        .from('booking_achievements') as any)
        .insert(achievementInserts);

      if (achievementsError) throw achievementsError;

      alert('Booking marked as completed successfully!');
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error marking booking as completed:', error);
      alert(error.message || 'Failed to mark booking as completed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedAchievementIds(new Set());
    setTimeToFinish('60');
    setAchievementNote('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Mark Booking as Completed</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time to Finish <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-gray-400" />
              <input
                type="number"
                min="1"
                max="999"
                value={timeToFinish}
                onChange={(e) => setTimeToFinish(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter minutes"
                required
              />
              <span className="text-sm text-gray-600">minutes</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Achievements <span className="text-red-500">*</span>
            </label>
            {errorMessage ? (
              <div className="text-center py-8 text-red-600 bg-red-50 rounded-lg border border-red-200">
                <p className="font-medium">Error loading achievements:</p>
                <p className="text-sm mt-1">{errorMessage}</p>
                <button
                  onClick={loadAchievements}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            ) : loading ? (
              <div className="text-center py-8 text-gray-500">Loading achievements...</div>
            ) : achievements.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                No achievements available for this game. Add achievements from the game profile first.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {achievements.map((achievement) => (
                  <label
                    key={achievement.id}
                    className={`flex items-start space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedAchievementIds.has(achievement.id)
                        ? 'bg-orange-50 border-2 border-orange-500'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAchievementIds.has(achievement.id)}
                      onChange={() => handleToggleAchievement(achievement.id)}
                      className="mt-1 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Trophy className="w-4 h-4 text-orange-600" />
                        <span className="font-medium text-gray-900">{achievement.title}</span>
                        {achievement.style_tag && (
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getStyleTagColor(achievement.style_tag)}`}>
                            {achievement.style_tag}
                          </span>
                        )}
                      </div>
                      {achievement.short_description && (
                        <p className="text-sm text-gray-600 mt-1">{achievement.short_description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
            <p className="text-sm text-gray-500 mt-2">
              Selected: {selectedAchievementIds.size} achievement{selectedAchievementIds.size !== 1 ? 's' : ''}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Achievement Note (optional)
            </label>
            <textarea
              value={achievementNote}
              onChange={(e) => setAchievementNote(e.target.value)}
              maxLength={120}
              rows={3}
              placeholder="Add a custom note about this achievement (max 120 characters)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
            />
            <p className="text-sm text-gray-500 mt-1">{achievementNote.length}/120 characters</p>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || selectedAchievementIds.size === 0 || !timeToFinish}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Saving...' : 'Mark as Completed'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
