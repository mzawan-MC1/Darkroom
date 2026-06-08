import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getOptimizedImageUrl } from '../../lib/media';
import {
  Clock, Users, DollarSign, Target, Star, HelpCircle, X, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, Calendar, Award
} from 'lucide-react';
import CustomerBookingModal from '../../components/CustomerBookingModal';
import SEOHead from '../../components/SEOHead';

interface Game {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  storyline: string | null;
  mission_objectives: string[] | null;
  difficulty: 'easy' | 'medium' | 'hard';
  duration_minutes: number;
  min_players: number;
  max_players: number;
  base_price: number;
  image_url: string | null;
}

interface GameFeature {
  id: string;
  title: string;
  description: string;
  icon: string;
  icon_image_url?: string;
  order_position: number;
}

interface GameFAQ {
  id: string;
  question: string;
  answer: string;
  order_position: number;
}

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string;
  order_position: number;
}

interface GameDetailPageProps {
  gameSlug: string;
  onNavigate: (page: string) => void;
}

export default function GameDetailPage({ gameSlug, onNavigate }: GameDetailPageProps) {
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<Game | null>(null);
  const [features, setFeatures] = useState<GameFeature[]>([]);
  const [faqs, setFAQs] = useState<GameFAQ[]>([]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    fetchGameData(signal);
    return () => controller.abort();
  }, [gameSlug]);

  const fetchGameData = async (signal?: AbortSignal) => {
    try {
      setLoading(true);

      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('slug', gameSlug)
        .abortSignal(signal as AbortSignal)
        .single() as any;

      if (gameError) throw gameError;
      setGame(gameData as any);

      const [featuresRes, faqsRes, galleryRes] = await Promise.all([
        supabase.from('game_features').select('*').eq('game_id', (gameData as any).id).order('order_position').abortSignal(signal as AbortSignal),
        supabase.from('game_faqs').select('*').eq('game_id', (gameData as any).id).order('order_position').abortSignal(signal as AbortSignal),
        supabase.from('game_gallery').select('*').eq('game_id', (gameData as any).id).order('order_position').abortSignal(signal as AbortSignal),
      ]);

      if (signal?.aborted) return;

      setFeatures((featuresRes.data as any[]) || []);
      setFAQs((faqsRes.data as any[]) || []);
      setGallery((galleryRes.data as any[]) || []);

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
        console.error('Error fetching game data:', error);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'hard':
        return 'bg-red-500/30 text-red-400 border-red-500/30';
      default:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

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
    return 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=1600&q=80';
  };

  const getGameMeta = (difficulty: Game['difficulty']) => {
    if (difficulty === 'easy') {
      return { successRate: 62, fearFactor: 3, intensityLabel: 'Tense' };
    }
    if (difficulty === 'hard') {
      return { successRate: 28, fearFactor: 8, intensityLabel: 'Relentless' };
    }
    return { successRate: 45, fearFactor: 6, intensityLabel: 'Unforgiving' };
  };

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  const nextLightboxImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % gallery.length);
  };

  const prevLightboxImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + gallery.length) % gallery.length);
  };

  const nextGallerySlide = () => {
    setCurrentGalleryIndex((prev) => (prev + 1) % gallery.length);
  };

  const prevGallerySlide = () => {
    setCurrentGalleryIndex((prev) => (prev - 1 + gallery.length) % gallery.length);
  };

  const handleBookNow = () => {
    setShowBookingModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal-950 bg-horror-radial flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 shadow-red-glow"></div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-charcoal-950 bg-horror-radial flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4 font-display tracking-wide">Game Not Found</h2>
          <button
            onClick={() => onNavigate('games')}
            className="dr-btn-primary px-6 py-3"
          >
            Back to Games
          </button>
        </div>
      </div>
    );
  }

  const meta = getGameMeta(game.difficulty);

  return (
    <>
      <SEOHead
        title={`${game.name} - Escape Room Game`}
        description={game.description || `Experience ${game.name}, an exciting escape room challenge.`}
        image={game.image_url || undefined}
      />
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          "name": game.name,
          "description": game.description || game.tagline || `Experience ${game.name} at LockOut Escape Room.`,
          "image": game.image_url || "https://thelockout.ae/logo.png",
          "brand": {
            "@type": "Brand",
            "name": "LockOut Escape Room"
          },
          "offers": {
            "@type": "Offer",
            "url": `https://thelockout.ae/game/${game.slug}`,
            "priceCurrency": "AED",
            "price": game.base_price,
            "availability": "https://schema.org/InStock",
             "priceValidUntil": "2025-12-31"
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "reviewCount": "120"
          }
        })}
      </script>

      <div className="min-h-screen bg-charcoal-950 bg-horror-radial">
        <div
          className="relative h-[600px] bg-cover bg-center"
          style={{
            backgroundImage: `url(${getOptimizedImageUrl(
              safeImageUrl(game.image_url) || 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=1920&q=80',
              { width: 1920, quality: 80 }
            )})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/55 to-charcoal-950" />
          <div className="absolute inset-0 opacity-[0.10] bg-horror-grain" style={{ backgroundSize: '4px 4px' }}></div>
          <div className="relative container mx-auto px-4 h-full flex items-center">
            <div className="max-w-3xl">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold border ${getDifficultyColor(game.difficulty)}`}>
                  {game.difficulty.toUpperCase()}
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border border-red-900/30 bg-black/30 text-slate-200">
                  Success Rate <span className="text-primary-300">{meta.successRate}%</span>
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border border-red-900/30 bg-black/30 text-slate-200">
                  Fear Factor <span className="text-primary-300">{meta.fearFactor}/10</span>
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 font-display tracking-wide">{game.name}</h1>
              {game.tagline && (
                <p className="text-2xl text-primary-400 mb-6 font-medium">{game.tagline}</p>
              )}
              {game.description && (
                <p className="text-lg text-slate-300 mb-8 leading-relaxed">{game.description}</p>
              )}

              <div className="flex flex-wrap gap-6 mb-8">
                <div className="flex items-center gap-2 text-white">
                  <Clock className="w-6 h-6 text-primary-400" />
                  <span className="text-lg">{game.duration_minutes} minutes</span>
                </div>
                <div className="flex items-center gap-2 text-white">
                  <Users className="w-6 h-6 text-primary-400" />
                  <span className="text-lg">{game.min_players}-{game.max_players} players</span>
                </div>
                <div className="flex items-center gap-2 text-white">
                  <DollarSign className="w-6 h-6 text-primary-400" />
                  <span className="text-lg">From AED {game.base_price}</span>
                </div>
              </div>

              <button
                onClick={handleBookNow}
                className="hidden md:inline-flex dr-btn-primary px-8 py-4 text-lg transform hover:scale-105"
              >
                <Calendar className="w-5 h-5 inline mr-2" />
                Book
              </button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-16 pb-28 md:pb-16 space-y-16">
          {game.storyline && (
            <section>
              <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-white mb-6 font-display tracking-wide">The Storyline</h2>
                <div className="dr-card rounded-xl p-8">
                  <p className="text-lg text-slate-300 leading-relaxed whitespace-pre-line">{game.storyline}</p>
                </div>
              </div>
            </section>
          )}

          {game.mission_objectives && game.mission_objectives.length > 0 && (
            <section>
              <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
                  <Target className="w-8 h-8 text-primary-400" />
                  Mission Objectives
                </h2>
                <div className="grid gap-4">
                  {game.mission_objectives.map((objective, index) => (
                    <div key={index} className="dr-card rounded-xl p-6 hover:border-primary-500/60 hover:shadow-red-glow transition-all">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-primary-500/10 rounded-full flex items-center justify-center shadow-red-glow">
                          <span className="text-primary-400 font-bold">{index + 1}</span>
                        </div>
                        <p className="text-lg text-slate-200 flex-1">{objective}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {features.length > 0 && (
            <section>
              <div className="max-w-6xl mx-auto">
                <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
                  <Star className="w-8 h-8 text-primary-400" />
                  Game Features
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {features.map((feature) => (
                    <div key={feature.id} className="dr-card rounded-xl p-6 hover:border-primary-500/60 hover:shadow-red-glow transition-all">
                      <div className="flex items-start gap-4">
                        {feature.icon_image_url ? (
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden">
                            <img src={getOptimizedImageUrl(feature.icon_image_url, { width: 100, height: 100 })} alt={feature.title} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-12 h-12 bg-primary-500/10 rounded-lg flex items-center justify-center shadow-red-glow">
                            <Award className="w-6 h-6 text-primary-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-white mb-2 font-display tracking-wide">{feature.title}</h3>
                          <p className="text-slate-300">{feature.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {gallery.length > 0 && (
            <section>
              <div className="max-w-6xl mx-auto">
                <h2 className="text-3xl font-bold text-white mb-8 font-display tracking-wide">Gallery</h2>

                <div className="relative dr-card rounded-xl overflow-hidden">
                  <div className="relative h-[500px]">
                    <img
                      src={getOptimizedImageUrl(safeImageUrl(gallery[currentGalleryIndex].image_url), { width: 1200, height: 800 })}
                      alt={gallery[currentGalleryIndex].caption || `Gallery image ${currentGalleryIndex + 1}`}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => openLightbox(currentGalleryIndex)}
                    />

                    {gallery[currentGalleryIndex].caption && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6">
                        <p className="text-white text-lg">{gallery[currentGalleryIndex].caption}</p>
                      </div>
                    )}

                    {gallery.length > 1 && (
                      <>
                        <button
                          onClick={prevGallerySlide}
                          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/80 rounded-full transition-all"
                        >
                          <ChevronLeft className="w-6 h-6 text-white" />
                        </button>
                        <button
                          onClick={nextGallerySlide}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/80 rounded-full transition-all"
                        >
                          <ChevronRight className="w-6 h-6 text-white" />
                        </button>

                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                          {gallery.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentGalleryIndex(index)}
                              className={`w-2 h-2 rounded-full transition-all ${
                                index === currentGalleryIndex
                                  ? 'bg-primary-500 w-8'
                                  : 'bg-white/50 hover:bg-white/80'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 p-4 bg-black/50">
                    {gallery.map((image, index) => (
                      <button
                        key={image.id}
                        onClick={() => setCurrentGalleryIndex(index)}
                        className={`relative aspect-square rounded-lg overflow-hidden transition-all ${
                          index === currentGalleryIndex
                            ? 'ring-2 ring-primary-500'
                            : 'opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={getOptimizedImageUrl(image.image_url, { width: 200, height: 200 })}
                          alt={image.caption || `Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {faqs.length > 0 && (
            <section>
              <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
                  <HelpCircle className="w-8 h-8 text-primary-400" />
                  Frequently Asked Questions
                </h2>
                <div className="space-y-4">
                  {faqs.map((faq) => (
                    <div key={faq.id} className="bg-black/30 border border-red-900/30 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-black/20 transition-colors"
                      >
                        <h3 className="text-lg font-semibold text-white pr-4">{faq.question}</h3>
                        {expandedFAQ === faq.id ? (
                          <ChevronUp className="w-5 h-5 text-primary-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-primary-400 flex-shrink-0" />
                        )}
                      </button>
                      {expandedFAQ === faq.id && (
                        <div className="px-6 pb-4">
                          <p className="text-slate-300 leading-relaxed">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section className="bg-black/30 border border-red-900/30 rounded-xl p-12 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready for the Challenge?</h2>
            <p className="text-lg text-slate-300 mb-8">Book your escape room experience today!</p>
            <button
              onClick={handleBookNow}
              className="px-8 py-4 bg-primary-500 text-white text-lg font-semibold rounded-lg hover:bg-primary-600 transition-all transform hover:scale-105 shadow-lg shadow-primary-500/50"
            >
              <Calendar className="w-5 h-5 inline mr-2" />
              Book Now
            </button>
          </section>
        </div>

        {/* Mobile fixed CTA bar */}
        <div className="md:hidden fixed left-0 right-0 bottom-[calc(env(safe-area-inset-bottom)+16px)] z-50 px-4">
          <div className="bg-black/60 backdrop-blur-md rounded-xl border border-red-900/30 p-3">
            <button
              onClick={handleBookNow}
              className="w-full px-6 py-3 bg-primary-500 text-white text-base font-semibold rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Calendar className="w-5 h-5 inline mr-2" />
              Book
            </button>
          </div>
        </div>

        {lightboxOpen && gallery.length > 0 && (
          <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            <button
              onClick={prevLightboxImage}
              className="absolute left-4 p-3 bg-black/50 hover:bg-black/80 rounded-full transition-colors"
            >
              <ChevronLeft className="w-8 h-8 text-white" />
            </button>

            <button
              onClick={nextLightboxImage}
              className="absolute right-4 p-3 bg-black/50 hover:bg-black/80 rounded-full transition-colors"
            >
              <ChevronRight className="w-8 h-8 text-white" />
            </button>

            <div className="max-w-5xl max-h-[90vh] flex flex-col items-center">
              <img
                src={getOptimizedImageUrl(safeImageUrl(gallery[currentImageIndex].image_url), { width: 1600, quality: 85 })}
                alt={gallery[currentImageIndex].caption || `Image ${currentImageIndex + 1}`}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
              {gallery[currentImageIndex].caption && (
                <p className="text-white text-lg mt-4 text-center">{gallery[currentImageIndex].caption}</p>
              )}
              <p className="text-slate-400 mt-2">
                {currentImageIndex + 1} / {gallery.length}
              </p>
            </div>
          </div>
        )}

        {showBookingModal && game && (
          <CustomerBookingModal
            game={{
              id: game.id,
              name: game.name,
              tagline: game.tagline || '',
              description: game.description || '',
              difficulty: game.difficulty,
              duration_minutes: game.duration_minutes,
              min_players: game.min_players,
              max_players: game.max_players,
              base_price: game.base_price,
              image_url: game.image_url
            }}
            onClose={() => setShowBookingModal(false)}
            onBookingCreated={() => {
              setShowBookingModal(false);
              // Success message is handled by the modal
            }}
          />
        )}
      </div>
    </>
  );
}
