import { Calendar, Users, Clock, Trophy, Star, Flag, Puzzle, ArrowRight, CheckCircle, Building2, Zap, Shield, Target, Award, Heart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getOptimizedImageUrl } from '../../lib/media';
import { fetchWithCache, CACHE_TTL } from '../../lib/cache';
import SEOHead from '../../components/SEOHead';
import PopupBanner from '../../components/PopupBanner';
import FeaturedBlogs from '../../components/FeaturedBlogs';
import GoogleReviewsSection from '../../components/GoogleReviewsSection';

interface LandingPageProps {
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

interface HeroSettings {
  height_value: number;
  height_unit: string;
  background_image: string;
  title: string;
  subtitle: string;
  primary_button_text: string;
  primary_button_action: string;
  secondary_button_text: string;
  secondary_button_action: string;
}

interface Testimonial {
  id: string;
  customer_name: string;
  customer_role: string | null;
  customer_avatar_url: string | null;
  rating: number;
  testimonial_text: string;
  is_featured: boolean;
  display_order: number;
}

interface ChallengeSectionSettings {
  tagline: string;
  title: string;
  description: string;
  button_text: string;
  button_action: string;
  image: string;
  media_type: string;
}

interface ChallengeFeature {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  display_order: number;
}

interface HomeStatItem {
  value: string;
  label: string;
  sublabel?: string;
}

interface HomeTestimonialFallback {
  quote: string;
  name: string;
  role?: string;
}

interface BrandSettings {
  companyName: string;
  address: string;
  logoUrl: string;
  socialLinks: string[];
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [challengeFeatures, setChallengeFeatures] = useState<ChallengeFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroSettings, setHeroSettings] = useState<HeroSettings>({
    height_value: 50,
    height_unit: 'vh',
    background_image: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=1600',
    title: 'OUR ROOMS',
    subtitle: 'Welcome to Your Next Adventure',
    primary_button_text: 'Book Your Adventure',
    primary_button_action: 'book',
    secondary_button_text: 'Explore Games',
    secondary_button_action: 'games',
  });
  const [challengeSettings, setChallengeSettings] = useState<ChallengeSectionSettings>({
    tagline: 'THE ULTIMATE CHALLENGE',
    title: 'Face Your Fear',
    description: 'Immersive escape rooms with cutting-edge technology and mind-bending puzzles.',
    button_text: 'Explore Rooms',
    button_action: 'games',
    image: 'https://images.unsplash.com/photo-1614200187524-dc4b892acf16?w=800',
    media_type: 'image',
  });
  const [homeStatsContent, setHomeStatsContent] = useState<{
    heading: string;
    description: string;
    bullets: string[];
    buttonText: string;
    buttonAction: string;
    items: HomeStatItem[];
  }>({
    heading: 'Ready for the Challenge?',
    description: 'Book your escape room adventure today and create memories that will last a lifetime. Perfect for friends, families, and corporate teams.',
    bullets: [
      'Group discounts available for 3+ players',
      'Professional game masters and support',
      'Free parking and refreshments',
      'Photo opportunities and souvenirs',
    ],
    buttonText: 'Book Your Slot Now',
    buttonAction: 'book',
    items: [
      { value: '5000+', label: 'Happy Players' },
      { value: '4.9', label: 'Average Rating', sublabel: '★★★★★' },
      { value: '98%', label: 'Success Rate' },
      { value: '24/7', label: 'Support' },
    ],
  });
  const [testimonialContent, setTestimonialContent] = useState<{
    heading: string;
    subtitle: string;
    fallbackItems: HomeTestimonialFallback[];
  }>({
    heading: 'What Our Players Say',
    subtitle: "Don't just take our word for it",
    fallbackItems: [
      {
        quote: 'The sets felt like a movie. Every room built tension in a way that kept our entire team locked in.',
        name: 'Nadia R.',
        role: 'Birthday Group',
      },
      {
        quote: 'We have done dozens of escape rooms and this was one of the most polished experiences we have ever played.',
        name: 'Omar K.',
        role: 'Corporate Team Lead',
      },
      {
        quote: 'Perfect balance of fear, story, and puzzle flow. We talked about the finale the whole way home.',
        name: 'Sana & Friends',
        role: 'Weekend Booking',
      },
    ],
  });
  const [brandSettings, setBrandSettings] = useState<BrandSettings>({
    companyName: 'DarkRoom',
    address: 'Al Quoz, Dubai, United Arab Emirates',
    logoUrl: '/logo.png',
    socialLinks: [],
  });

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    fetchGames(signal);
    fetchHeroSettings(signal);
    fetchTestimonials(signal);
    fetchChallengeSettings(signal);
    fetchChallengeFeatures(signal);

    return () => {
      controller.abort();
    };
  }, []);

  const safeImageUrl = (url?: string) => {
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

  const fetchGames = async (signal?: AbortSignal) => {
    try {
      const data = await fetchWithCache('landing_games', async () => {
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .eq('status', 'active')
          .limit(3)
          .abortSignal(signal as AbortSignal);

        if (error) throw error;
        return data;
      }, CACHE_TTL.MEDIUM);

      setGames((data as any[]) || []);
    } catch (error: any) {
      if (!error) return;
      const isAbort = 
        error.name === 'AbortError' || 
        error.code === 20 ||
        error.code === '20' ||
        JSON.stringify(error).includes('AbortError') ||
        JSON.stringify(error).includes('aborted');

      if (!isAbort) {
        console.error('Error fetching games:', error);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  const fetchHeroSettings = async (signal?: AbortSignal) => {
    try {
      const data = await fetchWithCache('landing_hero_settings', async () => {
        const { data, error } = await supabase
          .from('site_settings')
          .select('setting_key, setting_value')
          .in('setting_key', [
            'hero_height_value',
            'hero_height_unit',
            'hero_background_image',
            'hero_title',
            'hero_subtitle',
            'hero_primary_button_text',
            'hero_primary_button_action',
            'hero_secondary_button_text',
            'hero_secondary_button_action',
            'home_stats_heading',
            'home_stats_description',
            'home_stats_bullets',
            'home_stats_button_text',
            'home_stats_button_action',
            'home_stats_items',
            'home_testimonials_heading',
            'home_testimonials_subtitle',
            'home_testimonials_fallback',
            'company_name',
            'address',
            'logo_url',
            'facebook_url',
            'instagram_url',
            'twitter_url',
            'linkedin_url',
          ])
          .abortSignal(signal as AbortSignal);

        if (error) throw error;
        return data;
      }, CACHE_TTL.LONG);

      if (data && data.length > 0) {
        const settings: any = {};
        (data as any[]).forEach((item) => {
          const key = item.setting_key.replace('hero_', '');
          const value = typeof item.setting_value === 'string'
            ? item.setting_value
            : item.setting_value?.value || item.setting_value;
          settings[key] = value;
        });

        setHeroSettings({
          height_value: settings.height_value || 50,
          height_unit: settings.height_unit || 'vh',
          background_image: settings.background_image || 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=1600',
          title: settings.title || 'OUR ROOMS',
          subtitle: settings.subtitle || 'Welcome to Your Next Adventure',
          primary_button_text: settings.primary_button_text || 'Book Your Adventure',
          primary_button_action: settings.primary_button_action || 'book',
          secondary_button_text: settings.secondary_button_text || 'Explore Games',
          secondary_button_action: settings.secondary_button_action || 'games',
        });

        setHomeStatsContent({
          heading: settings.home_stats_heading || 'Ready for the Challenge?',
          description: settings.home_stats_description || 'Book your escape room adventure today and create memories that will last a lifetime. Perfect for friends, families, and corporate teams.',
          bullets: Array.isArray(settings.home_stats_bullets) && settings.home_stats_bullets.length > 0
            ? settings.home_stats_bullets
            : [
                'Group discounts available for 3+ players',
                'Professional game masters and support',
                'Free parking and refreshments',
                'Photo opportunities and souvenirs',
              ],
          buttonText: settings.home_stats_button_text || 'Book Your Slot Now',
          buttonAction: settings.home_stats_button_action || 'book',
          items: Array.isArray(settings.home_stats_items) && settings.home_stats_items.length > 0
            ? settings.home_stats_items
            : [
                { value: '5000+', label: 'Happy Players' },
                { value: '4.9', label: 'Average Rating', sublabel: '★★★★★' },
                { value: '98%', label: 'Success Rate' },
                { value: '24/7', label: 'Support' },
              ],
        });

        setTestimonialContent({
          heading: settings.home_testimonials_heading || 'What Our Players Say',
          subtitle: settings.home_testimonials_subtitle || "Don't just take our word for it",
          fallbackItems: Array.isArray(settings.home_testimonials_fallback) && settings.home_testimonials_fallback.length > 0
            ? settings.home_testimonials_fallback
            : [
                {
                  quote: 'The sets felt like a movie. Every room built tension in a way that kept our entire team locked in.',
                  name: 'Nadia R.',
                  role: 'Birthday Group',
                },
                {
                  quote: 'We have done dozens of escape rooms and this was one of the most polished experiences we have ever played.',
                  name: 'Omar K.',
                  role: 'Corporate Team Lead',
                },
                {
                  quote: 'Perfect balance of fear, story, and puzzle flow. We talked about the finale the whole way home.',
                  name: 'Sana & Friends',
                  role: 'Weekend Booking',
                },
              ],
        });

        setBrandSettings({
          companyName: settings.company_name || 'DarkRoom',
          address: settings.address || 'Al Quoz, Dubai, United Arab Emirates',
          logoUrl: settings.logo_url || '/logo.png',
          socialLinks: [
            settings.instagram_url,
            settings.facebook_url,
            settings.twitter_url,
            settings.linkedin_url,
          ].filter(Boolean),
        });
      }
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
        console.error('Error fetching hero settings:', error);
      }
    }
  };

  const fetchTestimonials = async (signal?: AbortSignal) => {
    try {
      const data = await fetchWithCache('landing_testimonials', async () => {
        const { data, error } = await supabase
          .from('testimonials')
          .select('*')
          .eq('is_active', true)
          .eq('is_featured', true)
          .order('display_order', { ascending: true })
          .abortSignal(signal as AbortSignal);

        if (error) throw error;
        return data;
      }, CACHE_TTL.MEDIUM);

      setTestimonials(data || []);
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
        console.error('Error fetching testimonials:', error);
      }
    }
  };

  const fetchChallengeSettings = async (signal?: AbortSignal) => {
    try {
      const data = await fetchWithCache('landing_challenge_settings', async () => {
        const { data, error } = await supabase
          .from('site_settings')
          .select('setting_key, setting_value')
          .in('setting_key', [
            'challenge_section_tagline',
            'challenge_section_title',
            'challenge_section_description',
            'challenge_section_button_text',
            'challenge_section_button_action',
            'challenge_section_image',
            'challenge_section_media_type',
          ])
          .abortSignal(signal as AbortSignal);

        if (error) throw error;
        return data;
      }, CACHE_TTL.LONG);

      if (data && data.length > 0) {
        const settings: any = { ...challengeSettings };
        (data as any[]).forEach((item) => {
          const key = item.setting_key.replace('challenge_section_', '');
          const value = typeof item.setting_value === 'string'
            ? item.setting_value
            : item.setting_value?.value || item.setting_value;
          settings[key] = value?.replace(/^"|"$/g, '') || settings[key];
        });
        setChallengeSettings(settings);
      }
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
        console.error('Error fetching challenge settings:', error);
      }
    }
  };

  const fetchChallengeFeatures = async (signal?: AbortSignal) => {
    try {
      const data = await fetchWithCache('landing_challenge_features', async () => {
        const { data, error } = await supabase
          .from('challenge_features')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .abortSignal(signal as AbortSignal);

        if (error) throw error;
        return data;
      }, CACHE_TTL.LONG);

      setChallengeFeatures((data as any[]) || []);
    } catch (error: any) {
      if (error.name !== 'AbortError' && !error.message?.includes('AbortError') && !error.message?.includes('The user aborted a request')) {
        console.error('Error fetching challenge features:', error);
      }
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getIconComponent = (iconName: string) => {
    const icons: { [key: string]: any } = {
      CheckCircle,
      Star,
      Users,
      Trophy,
      Clock,
      Zap,
      Shield,
      Target,
      Award,
      Heart,
      Flag,
      Puzzle,
    };
    return icons[iconName] || CheckCircle;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-orange-400';
      case 'expert': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://darkroom.ae';

  return (
    <div className="min-h-screen bg-charcoal-950 bg-horror-radial">
      <SEOHead
        pageIdentifier="home"
        fallbackTitle="Escape Room - Ultimate Adventure Experience"
        fallbackDescription="Experience the ultimate escape room adventure in Dubai. Solve mind-bending puzzles and race against time."
      />
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "EntertainmentBusiness",
          "name": brandSettings.companyName,
          "url": siteUrl,
          "address": {
            "@type": "PostalAddress",
            "streetAddress": brandSettings.address,
            "addressCountry": "AE",
            "addressLocality": "Dubai"
          },
          "logo": brandSettings.logoUrl,
          "sameAs": brandSettings.socialLinks
        })}
      </script>
      <PopupBanner />
      <section
        className="relative flex items-center justify-center bg-black overflow-hidden"
        style={{ height: `${heroSettings.height_value}${heroSettings.height_unit}` }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url('${getOptimizedImageUrl(safeImageUrl(heroSettings.background_image), { width: 1920, quality: 80 })}')` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black"></div>
        <div className="absolute inset-0 opacity-[0.12] bg-horror-grain" style={{ backgroundSize: '4px 4px' }}></div>

        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-32">
          <div className="mb-4">
            <span className="inline-block text-primary-300 text-sm tracking-[0.35em] uppercase font-semibold mb-6">
              {heroSettings.subtitle}
            </span>
          </div>
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-6 tracking-tight uppercase font-display">
            {heroSettings.title}
          </h1>
          <img 
            src={brandSettings.logoUrl} 
            alt={`${brandSettings.companyName} logo`}
            className="hidden" 
            aria-hidden="true" 
          />

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
            {heroSettings.primary_button_text && heroSettings.primary_button_action && (
              <a
                href={`/${heroSettings.primary_button_action}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(heroSettings.primary_button_action);
                }}
                className="dr-btn-primary px-10 py-4 text-sm tracking-wider uppercase transform hover:scale-105 inline-block"
              >
                {heroSettings.primary_button_text}
              </a>
            )}
            {heroSettings.secondary_button_text && heroSettings.secondary_button_action && (
              <a
                href={`/${heroSettings.secondary_button_action}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(heroSettings.secondary_button_action);
                }}
                className="flex items-center justify-center gap-2 dr-btn-ghost px-10 py-4 text-sm tracking-wider uppercase inline-block"
              >
                {heroSettings.secondary_button_text}
                <ArrowRight className="w-5 h-5" />
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="py-20 bg-charcoal-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <div className="aspect-video dr-card overflow-hidden">
                {challengeSettings.image ? (
                  challengeSettings.media_type === 'video' ? (
                    <video
                      src={safeImageUrl(challengeSettings.image)}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={getOptimizedImageUrl(safeImageUrl(challengeSettings.image), { width: 800, quality: 80 })}
                      alt={challengeSettings.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  )
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-black via-slate-900 to-red-950/50 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-4 bg-primary-500/10 rounded-full flex items-center justify-center shadow-red-glow">
                        <svg className="w-10 h-10 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                      <p className="text-slate-500 text-sm uppercase tracking-wider">Experience Preview</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl"></div>
            </div>

            <div className="space-y-6">
              <div>
                <span className="inline-block text-primary-300 text-xs tracking-[0.35em] uppercase font-bold mb-3">
                  {challengeSettings.tagline}
                </span>
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight font-display">
                  {challengeSettings.title}
                </h2>
                <p className="text-slate-300 text-base leading-relaxed">
                  {challengeSettings.description}
                </p>
              </div>

              <div className="space-y-4">
                {challengeFeatures.map((feature) => {
                  const IconComponent = getIconComponent(feature.icon_name);
                  return (
                    <div key={feature.id} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-primary-500/10 rounded-lg flex items-center justify-center">
                        <IconComponent className="w-5 h-5 text-primary-500" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                        <p className="text-slate-500 text-sm">{feature.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <a
                href={`/${challengeSettings.button_action}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(challengeSettings.button_action);
                }}
                className="inline-flex items-center gap-2 dr-btn-primary px-8 py-3 text-sm tracking-wider uppercase">
                {challengeSettings.button_text}
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <p className="text-primary-500 text-sm tracking-wider uppercase mb-4 font-medium">
              Quest rooms for every taste!
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-white uppercase tracking-wide">
              OUR GAMES ARE PERFECT FOR
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <Users className="w-16 h-16 text-primary-500 stroke-[1.5]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 uppercase tracking-wide">
                FRIENDS & FAMILIES
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Experience the exciting adventure with your family and friends!
              </p>
            </div>

            <div className="text-center">
              <div className="flex justify-center mb-6">
                <Puzzle className="w-16 h-16 text-primary-500 stroke-[1.5]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 uppercase tracking-wide">
                HOBBY DETECTIVES
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                You are a hobby detective yourself or have a very special idea for your date.
              </p>
            </div>

            <div className="text-center">
              <div className="flex justify-center mb-6">
                <Flag className="w-16 h-16 text-primary-500 stroke-[1.5]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 uppercase tracking-wide">
                TRENDSETTERS
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Are you bored and looking for new challenges?
              </p>
            </div>

            <div className="text-center">
              <div className="flex justify-center mb-6">
                <Building2 className="w-16 h-16 text-primary-500 stroke-[1.5]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 uppercase tracking-wide">
                TEAM BUILDING
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Corporate event to build the team spirit in your company.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Featured Games</h2>
            <p className="text-xl text-slate-400">
              Choose your adventure from our collection of thrilling escape rooms
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="bg-slate-900 border border-red-900/30 rounded-xl shadow-lg overflow-hidden hover:border-primary-500/50 hover:shadow-2xl hover:shadow-primary-500/20 transition-all transform hover:-translate-y-2 cursor-pointer block"
                >
                  <a 
                    href={`/game/${game.slug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate(`/game/${game.slug}`);
                    }}
                    className="block"
                  >
                  <div className="h-56 bg-gradient-to-br from-black to-slate-900 relative overflow-hidden">
                    {game.image_url ? (
                      <img
                        src={getOptimizedImageUrl(game.image_url, { width: 600, height: 400 })}
                        alt={game.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Trophy className="w-20 h-20 text-white/30" />
                      </div>
                    )}
                    <div className="absolute top-4 right-4 px-3 py-1 bg-black/80 backdrop-blur-sm rounded-full border border-primary-500/50">
                      <span className={`text-sm font-semibold ${getDifficultyColor(game.difficulty)}`}>
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
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl font-bold text-primary-500">AED {game.base_price}</span>
                        <span className="text-slate-500 text-sm">/player</span>
                      </div>
                      <span
                        className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                      >
                        Explore
                      </span>
                    </div>
                  </div>
                  </a>
                </div>
              ))}
            </div>
          )}

          <div className="text-center">
            <a
              href="/games"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('games');
              }}
              className="inline-flex items-center gap-2 px-8 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors shadow-lg"
            >
              View All Games
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-slate-900 via-black to-red-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">{homeStatsContent.heading}</h2>
              <p className="text-xl text-slate-300 mb-8">
                {homeStatsContent.description}
              </p>
              <ul className="space-y-4 mb-8">
                {homeStatsContent.bullets.map((bullet, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-primary-500 flex-shrink-0" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              <a
                href={`/${homeStatsContent.buttonAction}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(homeStatsContent.buttonAction);
                }}
                className="flex items-center gap-2 px-8 py-4 bg-primary-500 hover:bg-primary-600 text-white text-lg font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg inline-block"
              >
                <Calendar className="w-6 h-6" />
                {homeStatsContent.buttonText}
              </a>
            </div>
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                {homeStatsContent.items.slice(0, 4).map((item, index) => (
                  <div key={index} className="bg-black/50 backdrop-blur-sm rounded-xl p-6 text-center border border-red-900/30">
                    <div className="text-4xl font-bold mb-2 text-primary-500">{item.value}</div>
                    <div className="text-slate-400">{item.label}</div>
                    {item.sublabel && <div className="text-sm text-slate-500 mt-2">{item.sublabel}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">{testimonialContent.heading}</h2>
            <p className="text-xl text-slate-400">{testimonialContent.subtitle}</p>
          </div>

          {testimonials.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial) => (
                <div
                  key={testimonial.id}
                  className="bg-black/50 border border-red-900/30 rounded-xl p-6 hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/20 transition-all"
                >
                  <div className="flex items-center gap-1 text-yellow-400 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-current" />
                    ))}
                  </div>
                  <p className="text-slate-300 mb-4">"{testimonial.testimonial_text}"</p>
                  <div className="flex items-center gap-3">
                    {testimonial.customer_avatar_url ? (
                      <img
                        src={getOptimizedImageUrl(testimonial.customer_avatar_url, { width: 100, height: 100 })}
                        alt={testimonial.customer_name}
                        className="w-10 h-10 rounded-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {getInitials(testimonial.customer_name)}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-white">{testimonial.customer_name}</div>
                      {testimonial.customer_role && (
                        <div className="text-sm text-slate-500">{testimonial.customer_role}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonialContent.fallbackItems.map((item, index) => (
                <div
                  key={index}
                  className="bg-black/50 border border-red-900/30 rounded-xl p-6 hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/20 transition-all"
                >
                  <div className="flex items-center gap-1 text-yellow-400 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-current" />
                    ))}
                  </div>
                  <p className="text-slate-300 mb-4">"{item.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {getInitials(item.name)}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{item.name}</div>
                      {item.role && <div className="text-sm text-slate-500">{item.role}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <GoogleReviewsSection />

      <FeaturedBlogs onNavigate={onNavigate} />
    </div>
  );
}
