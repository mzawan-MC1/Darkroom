import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Gamepad2, Trash2, Users, Clock, DollarSign, Eye, Calendar, Percent, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import GameScheduleModal from '../../components/GameScheduleModal';
import GroupDiscountManager from '../../components/GroupDiscountManager';

interface Game {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  storyline: string | null;
  description: string | null;
  mission_objectives: string[] | null;
  difficulty: 'easy' | 'medium' | 'hard';
  duration_minutes: number;
  min_players: number;
  max_players: number;
  base_price: number;
  room_number: string | null;
  image_url: string | null;
  status: string;
  created_at: string;
}

export default function GamesManagement() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedGameForSchedule, setSelectedGameForSchedule] = useState<{ id: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'games' | 'discounts'>('games');

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewGame = () => {
    navigate('/admin/game-profile/new');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this game?')) return;

    try {
      if (!hasPermission('games.delete')) {
        alert('Not authorised to delete games');
        return;
      }
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Game deleted successfully!');
      fetchGames();
    } catch (error: any) {
      console.error('Error deleting game:', error);
      alert(error.message || 'Failed to delete game');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-primary-500/20 text-primary-400';
      case 'hard':
        return 'bg-red-500/30 text-red-400';
      default:
        return 'bg-primary-500/10 text-primary-300';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-white">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Games Management</h1>
          <p className="text-slate-300 mt-1">Create and manage your escape room games</p>
        </div>
        {activeTab === 'games' && hasPermission('games.create') && (
          <button
            onClick={handleCreateNewGame}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add New Game
          </button>
        )}
      </div>

      <div className="border-b border-red-900/30">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('games')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'games'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-slate-400 hover:text-white hover:border-red-900/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4" />
              Games
            </div>
          </button>
          <button
            onClick={() => setActiveTab('discounts')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'discounts'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-slate-400 hover:text-white hover:border-red-900/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Global Group Discounts
            </div>
          </button>
        </nav>
      </div>

      {activeTab === 'games' && games.length === 0 ? (
        <div className="bg-black/50 rounded-xl shadow-sm border border-red-900/30 p-12 text-center hover:border-primary-500/50 hover:shadow-primary-500/20 transition-all">
          <Gamepad2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No games yet</h3>
          <p className="text-slate-400 mb-6">Create your first escape room game to get started</p>
          <button
            onClick={handleCreateNewGame}
            className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            Create First Game
          </button>
        </div>
      ) : activeTab === 'games' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <div
              key={game.id}
              className="bg-black/50 rounded-xl shadow-sm border border-red-900/30 overflow-hidden hover:border-primary-500/50 hover:shadow-primary-500/20 transition-all"
            >
              <div className="h-48 bg-slate-900 relative">
                {game.image_url ? (
                  <img src={game.image_url} alt={game.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Gamepad2 className="w-16 h-16 text-slate-600" />
                  </div>
                )}
                <div className="absolute top-3 right-3 flex gap-2">
                  {hasPermission('games.edit') && (
                    <button
                      onClick={() => navigate(`/admin/game-profile/${game.id}`)}
                      className="p-2 bg-black/80 border border-red-900/30 rounded-lg shadow-sm hover:bg-slate-900 hover:border-primary-500/50 transition-all"
                      title="Edit Game"
                    >
                      <Settings className="w-4 h-4 text-primary-400" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedGameForSchedule({ id: game.id, name: game.name });
                      setShowScheduleModal(true);
                    }}
                    className="p-2 bg-black/80 border border-red-900/30 rounded-lg shadow-sm hover:bg-slate-900 hover:border-primary-500/50 transition-all"
                    title="Schedule Time Slots"
                  >
                    <Calendar className="w-4 h-4 text-slate-400" />
                  </button>
                  <button
                    onClick={() => window.open(`/customer?game=${game.slug}`, '_blank')}
                    className="p-2 bg-black/80 border border-red-900/30 rounded-lg shadow-sm hover:bg-slate-900 hover:border-primary-500/50 transition-all"
                    title="View as Customer"
                  >
                    <Eye className="w-4 h-4 text-slate-400" />
                  </button>
                  {hasPermission('games.delete') && (
                    <button
                      onClick={() => handleDelete(game.id)}
                      className="p-2 bg-black/80 border border-red-900/30 rounded-lg shadow-sm hover:bg-red-900/50 hover:border-red-500 transition-all"
                      title="Delete Game"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-white">{game.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(game.difficulty)}`}>
                    {game.difficulty}
                  </span>
                </div>
                {game.description && (
                  <p className="text-sm text-slate-400 mb-4 line-clamp-2">{game.description}</p>
                )}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Clock className="w-4 h-4" />
                    <span>{game.duration_minutes} minutes</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Users className="w-4 h-4" />
                    <span>{game.min_players}-{game.max_players} players</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <DollarSign className="w-4 h-4" />
                    <span>${game.base_price}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-black/50 rounded-xl shadow-sm border border-red-900/30 p-6 hover:border-primary-500/50 hover:shadow-primary-500/20 transition-all">
          <GroupDiscountManager gameId={null} />
        </div>
      )}

      {showScheduleModal && selectedGameForSchedule && (
        <GameScheduleModal
          gameId={selectedGameForSchedule.id}
          gameName={selectedGameForSchedule.name}
          onClose={() => {
            setShowScheduleModal(false);
            setSelectedGameForSchedule(null);
          }}
          onScheduleCreated={() => {
            fetchGames();
          }}
        />
      )}
    </div>
  );
}
