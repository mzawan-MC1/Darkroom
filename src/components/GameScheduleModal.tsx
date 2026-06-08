import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface GameScheduleModalProps {
  gameId: string;
  gameName: string;
  onClose: () => void;
  onScheduleCreated: () => void;
}

interface Schedule {
  id?: string;
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  max_participants: number;
  is_active: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function GameScheduleModal({ gameId, gameName, onClose, onScheduleCreated }: GameScheduleModalProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [existingSchedules, setExistingSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generateSlotsMonths, setGenerateSlotsMonths] = useState(3);

  useEffect(() => {
    loadExistingSchedules();
  }, [gameId]);

  const loadExistingSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('game_schedules')
        .select('*')
        .eq('game_id', gameId)
        .order('day_of_week', { ascending: true });

      if (error) throw error;
      setExistingSchedules(data || []);
    } catch (err: any) {
      console.error('Error loading schedules:', err);
    }
  };

  const addSchedule = () => {
    setSchedules([
      ...schedules,
      {
        day_of_week: 1,
        start_time: '10:00',
        duration_minutes: 60,
        max_participants: 8,
        is_active: true,
      },
    ]);
  };

  const removeSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const updateSchedule = (index: number, field: keyof Schedule, value: any) => {
    const updated = [...schedules];
    updated[index] = { ...updated[index], [field]: value };
    setSchedules(updated);
  };

  const deleteExistingSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule? This will also delete all associated time slots.')) {
      return;
    }

    try {
      const { error } = await (supabase
        .from('game_schedules') as any)
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;
      await loadExistingSchedules();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleExistingSchedule = async (schedule: Schedule) => {
    try {
      const { error } = await (supabase
        .from('game_schedules') as any)
        .update({ is_active: !schedule.is_active })
        .eq('id', schedule.id);

      if (error) throw error;
      await loadExistingSchedules();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (schedules.length === 0) {
        throw new Error('Please add at least one schedule');
      }

      const schedulesToInsert = schedules.map(schedule => ({
        game_id: gameId,
        ...schedule,
      }));

      const { error: insertError } = await (supabase
        .from('game_schedules') as any)
        .insert(schedulesToInsert);

      if (insertError) throw insertError;

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + generateSlotsMonths);

      const { error: generateError } = await (supabase.rpc as any)('generate_slots_for_date_range', {
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0],
        p_game_id: gameId,
      });

      if (generateError) throw generateError;

      onScheduleCreated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Schedule Game: {gameName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {existingSchedules.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Existing Schedules</h3>
              <div className="space-y-2">
                {existingSchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-medium text-gray-900">
                        {DAYS_OF_WEEK.find(d => d.value === schedule.day_of_week)?.label}
                      </span>
                      <span className="text-gray-600">
                        <Clock className="w-4 h-4 inline mr-1" />
                        {schedule.start_time} ({schedule.duration_minutes} min)
                      </span>
                      <span className="text-gray-600">
                        Max: {schedule.max_participants} players
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          schedule.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {schedule.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => toggleExistingSchedule(schedule)}
                        className="px-3 py-1 text-sm bg-primary-500 text-white rounded hover:bg-primary-600"
                      >
                        {schedule.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteExistingSchedule(schedule.id!)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">New Schedules</h3>
              <button
                type="button"
                onClick={addSchedule}
                className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                <Plus className="w-4 h-4" />
                Add Schedule
              </button>
            </div>

            {schedules.length === 0 && existingSchedules.length === 0 && (
              <p className="text-gray-500 text-sm">
                No schedules added yet. Click "Add Schedule" to create recurring time slots for this game.
              </p>
            )}

            <div className="space-y-4">
              {schedules.map((schedule, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-700">Schedule {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeSchedule(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Day of Week
                      </label>
                      <select
                        value={schedule.day_of_week}
                        onChange={(e) => updateSchedule(index, 'day_of_week', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                        required
                      >
                        {DAYS_OF_WEEK.map(day => (
                          <option key={day.value} value={day.value}>
                            {day.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={schedule.start_time}
                        onChange={(e) => updateSchedule(index, 'start_time', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        value={schedule.duration_minutes}
                        onChange={(e) => updateSchedule(index, 'duration_minutes', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                        min="15"
                        max="480"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Participants
                      </label>
                      <input
                        type="number"
                        value={schedule.max_participants}
                        onChange={(e) => updateSchedule(index, 'max_participants', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                        min="1"
                        max="50"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {schedules.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Generate Slots For Next (months)
              </label>
              <input
                type="number"
                value={generateSlotsMonths}
                onChange={(e) => setGenerateSlotsMonths(parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                min="1"
                max="12"
              />
              <p className="text-sm text-gray-500 mt-1">
                Time slots will be automatically generated based on these schedules
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || schedules.length === 0}
              className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Schedules...' : 'Create Schedules & Generate Slots'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
