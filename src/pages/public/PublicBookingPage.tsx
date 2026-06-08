import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Clock, Trophy, ArrowRight } from 'lucide-react';
import CustomerBookingModal from '../../components/CustomerBookingModal';

interface PublicBookingPageProps {
  onNavigate: (page: string) => void;
}

interface Game {
  id: string;
  name: string;
  tagline: string;
  description: string;
  difficulty: string;
  duration_minutes: number;
  min_players: number;
  max_players: number;
  base_price: number;
  image_url: string | null;
}

export default function PublicBookingPage({ onNavigate }: PublicBookingPageProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Suppress warning about unused onNavigate until we implement navigation within this page
  useEffect(() => {
    if (false) onNavigate('home'); 
  }, [onNavigate]);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    fetchGames(signal);
    return () => controller.abort();
  }, []);

  const fetchGames = async (signal?: AbortSignal) => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('status', 'active')
        .order('name')
        .abortSignal(signal as AbortSignal);

      if (error) throw error;
      setGames((data as any[]) || []);
    } catch (error: any) {
      const isAbort = 
        error.name === 'AbortError' || 
        error.code === 20 ||
        error.code === '20' ||
        error.message?.includes('AbortError') ||
        error.message?.includes('aborted') ||
        error.details?.includes('AbortError') ||
        error.details?.includes('aborted');

      if (!isAbort) {
        console.error('Error fetching games:', error);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  const handleBookGame = (game: Game) => {
    setSelectedGame(game);
    setShowBookingModal(true);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-primary-500/20 text-primary-400 border border-primary-500/30';
      case 'medium': return 'bg-primary-500/30 text-primary-300 border border-primary-500/40';
      case 'hard': return 'bg-primary-500/40 text-primary-200 border border-primary-500/50';
      case 'expert': return 'bg-primary-500 text-white border border-primary-600';
      default: return 'bg-slate-800 text-slate-400 border border-slate-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Book Your Adventure</h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Select a game and choose your preferred date and time. We'll see you there!
          </p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-8 text-white mb-12 border border-red-900/30 hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/20 transition-all">
          <h2 className="text-2xl font-bold mb-4">Group Discounts Available!</h2>
          <p className="text-slate-400 mb-6">
            Save more when you bring more friends. Discounts automatically applied at checkout.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-black/50 backdrop-blur-sm rounded-xl p-4 border border-red-900/30 hover:border-primary-500/50 transition-colors">
              <div className="text-2xl font-bold mb-1 text-primary-500">10% OFF</div>
              <div className="text-sm text-slate-400">3-4 Players</div>
            </div>
            <div className="bg-black/50 backdrop-blur-sm rounded-xl p-4 border border-red-900/30 hover:border-primary-500/50 transition-colors">
              <div className="text-2xl font-bold mb-1 text-primary-500">15% OFF</div>
              <div className="text-sm text-slate-400">5-6 Players</div>
            </div>
            <div className="bg-black/50 backdrop-blur-sm rounded-xl p-4 border border-red-900/30 hover:border-primary-500/50 transition-colors">
              <div className="text-2xl font-bold mb-1 text-primary-500">20% OFF</div>
              <div className="text-sm text-slate-400">7-8 Players</div>
            </div>
          </div>
        </div>

        {games.length === 0 ? (
          <div className="text-center py-12 bg-slate-900 rounded-2xl border border-red-900/30">
            <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-xl text-slate-400">No games available at the moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {games.map((game) => (
              <div
                key={game.id}
                className="bg-slate-900 rounded-2xl border border-red-900/30 overflow-hidden hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/20 transition-all transform hover:-translate-y-2"
              >
                <div className="h-56 bg-gradient-to-br from-slate-700 to-slate-900 relative overflow-hidden">
                  {game.image_url ? (
                    <img
                      src={game.image_url}
                      alt={game.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Trophy className="w-20 h-20 text-white/30" />
                    </div>
                  )}
                  <div className="absolute top-4 right-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getDifficultyColor(game.difficulty)}`}>
                      {game.difficulty?.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-white mb-2">{game.name}</h3>
                  <p className="text-slate-400 mb-4 line-clamp-2">{game.tagline || game.description}</p>
                  <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{game.min_players}-{game.max_players} players</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{game.duration_minutes} min</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-red-900/30">
                    <div>
                      <div className="text-sm text-slate-500">From</div>
                      <div className="text-2xl font-bold text-primary-500">
                        AED {game.base_price}
                        <span className="text-sm text-slate-500 font-normal">/player</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleBookGame(game)}
                      className="flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-colors"
                    >
                      Book
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 bg-slate-900 rounded-2xl p-8 border border-red-900/30 hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/20 transition-all">
          <h2 className="text-2xl font-bold text-white mb-6">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-black/50 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg border border-red-900/30">
                1
              </div>
              <h3 className="font-semibold text-white mb-2">Choose Your Game</h3>
              <p className="text-sm text-slate-400">
                Browse our collection and select the game that excites you most
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-black/50 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg border border-red-900/30">
                2
              </div>
              <h3 className="font-semibold text-white mb-2">Pick Date & Time</h3>
              <p className="text-sm text-slate-400">
                Select your preferred date and available time slot
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-black/50 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg border border-red-900/30">
                3
              </div>
              <h3 className="font-semibold text-white mb-2">Complete Booking</h3>
              <p className="text-sm text-slate-400">
                Fill in your details and confirm your reservation
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-black/50 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg border border-red-900/30">
                4
              </div>
              <h3 className="font-semibold text-white mb-2">Enjoy the Adventure</h3>
              <p className="text-sm text-slate-400">
                Arrive 15 minutes early and prepare for an amazing experience
              </p>
            </div>
          </div>
        </div>
      </div>

      {showBookingModal && selectedGame && (
        <CustomerBookingModal
          game={selectedGame}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedGame(null);
          }}
          onBookingCreated={() => {
            setShowBookingModal(false);
            setSelectedGame(null);
            fetchGames();
          }}
        />
      )}
    </div>
  );
}
