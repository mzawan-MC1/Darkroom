import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getOptimizedImageUrl } from '../../lib/media';
import { fetchWithCache, CACHE_TTL } from '../../lib/cache';
import { Users, Clock, Trophy, Filter, Search, ArrowRight } from 'lucide-react';
import SEOHead from '../../components/SEOHead';

interface GamesPageProps {
  onNavigate: (page: string) => void;
}

interface Game {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  difficulty: string;
  duration_minutes: number;
  min_players: number;
  max_players: number;
  base_price: number;
  image_url: string | null;
}

export default function GamesPage({ onNavigate }: GamesPageProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');

  const safeImageUrl = (url?: string | null) => {
    if (!url) return url;
    const u = url.toLowerCase();
    const looksUnrelated =
      u.includes('1522413452208-996ff3f3e740') ||
      u.includes('ferrari') ||
      u.includes('supercar') ||
      u.includes('lamborghini') ||
      u.includes('dining') ||
      u.includes('restaurant') ||
      u.includes('food') ||
      u.includes('spartan') ||
      u.includes('sparta') ||
      u.includes('roman') ||
      u.includes('warrior') ||
      u.includes('helmet');
    if (!looksUnrelated) return url;
    return 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=1200&q=80';
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const data = await fetchWithCache('games_page_all', async () => {
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .eq('status', 'active')
          .order('name');

        if (error) throw error;
        return data;
      }, CACHE_TTL.MEDIUM);

      setGames(data || []);
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-primary-500/20 text-primary-400';
      case 'medium': return 'bg-primary-500/30 text-primary-300';
      case 'hard': return 'bg-primary-500/40 text-primary-200';
      case 'expert': return 'bg-primary-500 text-white';
      default: return 'bg-slate-800 text-slate-400';
    }
  };

  /*
  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-primary-400';
      case 'medium': return 'text-primary-400';
      case 'hard': return 'text-primary-400';
      case 'expert': return 'text-primary-400';
      default: return 'text-slate-400';
    }
  };
  */

  const filteredGames = games.filter(game => {
    const matchesSearch = game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         game.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = difficultyFilter === 'all' || game.difficulty === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal-950 bg-horror-radial flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 shadow-red-glow"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal-950 bg-horror-radial pt-24 pb-12">
      <SEOHead
        pageIdentifier="games"
        fallbackTitle="Our Games - Escape Room"
        fallbackDescription="Explore our exciting escape room games. Choose your adventure and test your skills."
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-primary-300 text-xs tracking-[0.35em] uppercase font-semibold mb-4">
            Enter the Story
          </p>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Our Escape Rooms
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto">
            Choose from our collection of immersive escape room adventures. Each room offers unique challenges, captivating storylines, and unforgettable experiences.
          </p>
        </div>

        <div className="dr-panel p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search games..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="dr-input pl-10 pr-4 py-3"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="dr-select pl-10 pr-4 py-3 appearance-none"
              >
                <option value="all">All Difficulty Levels</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="expert">Expert</option>
              </select>
            </div>
          </div>
        </div>

        {filteredGames.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-xl text-slate-300">No games found matching your criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {filteredGames.map((game) => (
              <div
                key={game.id}
                className="dr-card overflow-hidden hover:border-primary-500/60 hover:shadow-red-glow transition-all transform hover:-translate-y-1 cursor-pointer block"
              >
                <a
                  href={`/game/${game.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(`/game/${game.slug}`);
                  }}
                  className="block md:flex h-full"
                >
                  <div className="md:w-2/5 h-64 md:h-auto bg-gradient-to-br from-charcoal-800 to-black relative overflow-hidden flex-shrink-0">
                    {game.image_url ? (
                      <img
                        src={getOptimizedImageUrl(safeImageUrl(game.image_url), { width: 640, height: 480 })}
                        alt={game.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Trophy className="w-20 h-20 text-slate-700" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute top-4 left-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getDifficultyColor(game.difficulty)}`}>
                        {game.difficulty?.charAt(0).toUpperCase() + game.difficulty?.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className="md:w-3/5 p-6 flex flex-col">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-white mb-2 font-display tracking-wide">{game.name}</h3>
                      <p className="text-primary-300 font-medium mb-3">{game.tagline}</p>
                      <p className="text-slate-300 mb-4 line-clamp-3">{game.description}</p>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Users className="w-5 h-5 text-primary-500" />
                          <span className="text-sm">{game.min_players}-{game.max_players} Players</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <Clock className="w-5 h-5 text-primary-500" />
                          <span className="text-sm">{game.duration_minutes} Minutes</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-red-900/30">
                      <div>
                        <div className="text-sm text-slate-500">Starting from</div>
                        <div className="text-2xl font-bold text-primary-500">
                          AED {game.base_price}
                          <span className="text-sm text-slate-500 font-normal">/player</span>
                        </div>
                      </div>
                      <span
                        className="dr-btn-primary px-6 py-3"
                      >
                        Explore
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </a>
              </div>
            ))}
          </div>
        )}

        <div className="mt-16 dr-panel p-8 md:p-12 text-center text-white">
          <p className="text-primary-300 text-xs tracking-[0.35em] uppercase font-semibold mb-4">
            Limited-Time Perks
          </p>
          <h2 className="text-3xl font-bold mb-4">Group Discounts Available!</h2>
          <p className="text-lg md:text-xl text-slate-300 mb-6 max-w-2xl mx-auto">
            Save up to 20% when you book with larger groups. Perfect for team building and celebrations!
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="dr-card p-6 hover:border-primary-500/60 hover:shadow-red-glow transition-colors">
              <div className="text-3xl font-bold mb-2 text-primary-500">10% OFF</div>
              <div className="text-slate-300">3-4 Players</div>
            </div>
            <div className="dr-card p-6 hover:border-primary-500/60 hover:shadow-red-glow transition-colors">
              <div className="text-3xl font-bold mb-2 text-primary-500">15% OFF</div>
              <div className="text-slate-300">5-6 Players</div>
            </div>
            <div className="dr-card p-6 hover:border-primary-500/60 hover:shadow-red-glow transition-colors">
              <div className="text-3xl font-bold mb-2 text-primary-500">20% OFF</div>
              <div className="text-slate-300">7-8 Players</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
