import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Gamepad2, Users, DollarSign, Search } from 'lucide-react';
import FileUpload from '../../components/FileUpload';

interface LobbyGame {
  id: string;
  name: string;
  description: string | null;
  hourly_price: number;
  image_url: string | null;
  is_available: boolean;
  max_players: number | null;
  created_at: string;
}

export default function LobbyGamesManagement() {
  const [games, setGames] = useState<LobbyGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGame, setEditingGame] = useState<LobbyGame | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hourly_price: '',
    max_players: '',
    image_url: '',
    is_available: true,
  });

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const { data, error } = await supabase
        .from('lobby_games')
        .select('*')
        .order('name');

      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      console.error('Error fetching lobby games:', error);
      alert('Error loading lobby games');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (game?: LobbyGame) => {
    if (game) {
      setEditingGame(game);
      setFormData({
        name: game.name,
        description: game.description || '',
        hourly_price: game.hourly_price.toString(),
        max_players: game.max_players?.toString() || '',
        image_url: game.image_url || '',
        is_available: game.is_available,
      });
    } else {
      setEditingGame(null);
      setFormData({
        name: '',
        description: '',
        hourly_price: '',
        max_players: '',
        image_url: '',
        is_available: true,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const gameData = {
        name: formData.name,
        description: formData.description || null,
        hourly_price: parseFloat(formData.hourly_price),
        max_players: formData.max_players ? parseInt(formData.max_players) : null,
        image_url: formData.image_url || null,
        is_available: formData.is_available,
      };

      if (editingGame) {
        const { error } = await (supabase
          .from('lobby_games') as any)
          .update(gameData)
          .eq('id', editingGame.id);

        if (error) throw error;
        alert('Lobby game updated successfully!');
      } else {
        const { error } = await (supabase
          .from('lobby_games') as any)
          .insert([gameData]);

        if (error) throw error;
        alert('Lobby game created successfully!');
      }

      setShowModal(false);
      fetchGames();
    } catch (error: any) {
      console.error('Error saving lobby game:', error);
      alert(error.message || 'Error saving lobby game');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lobby game?')) return;

    try {
      const { error } = await supabase
        .from('lobby_games')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Lobby game deleted successfully!');
      fetchGames();
    } catch (error) {
      console.error('Error deleting lobby game:', error);
      alert('Error deleting lobby game');
    }
  };

  const filteredGames = games.filter(game =>
    game.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Lobby Games Management</h3>
          <p className="text-slate-300 mt-1">Manage hourly lobby games and activities</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Lobby Game
        </button>
      </div>

      <div className="bg-black/50 rounded-xl border border-red-900/30 mb-6 p-4 hover:border-primary-500/50 transition-colors">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Search lobby games..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-500"
          />
        </div>
      </div>

      {filteredGames.length === 0 ? (
        <div className="bg-black/50 rounded-xl border border-red-900/30 p-12 text-center hover:border-primary-500/50 transition-colors">
          <Gamepad2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No lobby games found</h3>
          <p className="text-slate-400">
            {searchTerm ? 'Try adjusting your search' : 'Add your first lobby game to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGames.map((game) => (
            <div
              key={game.id}
              className="bg-slate-900 rounded-xl border border-red-900/30 overflow-hidden hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/20 transition-all"
            >
              <div className="h-48 bg-black/50 relative">
                {game.image_url ? (
                  <img src={game.image_url} alt={game.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Gamepad2 className="w-16 h-16 text-slate-600" />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    game.is_available
                      ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                      : 'bg-black/70 text-primary-500 border border-primary-500/30'
                  }`}>
                    {game.is_available ? 'Available' : 'Unavailable'}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2">{game.name}</h3>
                <p className="text-slate-400 mb-4 line-clamp-2 text-sm">
                  {game.description || 'No description provided'}
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <DollarSign className="w-4 h-4 text-primary-500" />
                    <span>AED {game.hourly_price}/hour</span>
                  </div>
                  {game.max_players && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Users className="w-4 h-4 text-primary-500" />
                      <span>Up to {game.max_players} players</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-4 border-t border-red-900/30">
                  <button
                    onClick={() => handleOpenModal(game)}
                    className="flex-1 flex items-center justify-center gap-2 p-2 text-primary-500 hover:bg-primary-500/20 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(game.id)}
                    className="flex-1 flex items-center justify-center gap-2 p-2 text-primary-500 hover:bg-primary-500 hover:text-white rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-red-900/30 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-red-900/30">
              <h3 className="text-xl font-bold text-white">
                {editingGame ? 'Edit Lobby Game' : 'New Lobby Game'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Game Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-500"
                  placeholder="e.g., Pool Table, Foosball"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-500"
                  placeholder="Describe the game or activity..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Hourly Price (AED)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.hourly_price}
                    onChange={(e) => setFormData({ ...formData, hourly_price: e.target.value })}
                    className="w-full px-3 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Max Players (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_players}
                    onChange={(e) => setFormData({ ...formData, max_players: e.target.value })}
                    className="w-full px-3 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-500"
                    placeholder="e.g., 4"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Game Image
                </label>
                <FileUpload
                  onUploadComplete={(url) => setFormData({ ...formData, image_url: url })}
                  currentImageUrl={formData.image_url}
                  folder="lobby-games"
                  accept="image/*"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_available"
                  checked={formData.is_available}
                  onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                  className="w-4 h-4 text-primary-500 border-red-900/30 rounded focus:ring-primary-500 bg-black/50"
                />
                <label htmlFor="is_available" className="text-sm font-medium text-white">
                  Available for booking
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingGame(null);
                  }}
                  className="flex-1 px-4 py-2 border border-red-900/30 text-white rounded-lg hover:bg-black/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  {editingGame ? 'Update Game' : 'Create Game'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
