import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getOptimizedImageUrl } from '../../lib/media';
import { Calendar, Clock, Eye } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type BlogPost = Database['public']['Tables']['blog_posts']['Row'];

interface BlogFallbackPostItem {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image_url: string;
  author_name: string;
}

interface BlogPageProps {
  onNavigate: (page: string) => void;
}

export default function BlogPage({ onNavigate }: BlogPageProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [blogHero, setBlogHero] = useState({
    title: 'Blog',
    subtitle: 'Stories, tips, and insights from the world of escape rooms',
  });
  const [fallbackPosts, setFallbackPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

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
    return 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=1400&q=80';
  };

  const defaultDemoPosts: BlogPost[] = [
    {
      id: 'demo-1',
      title: 'The Anatomy of a Great Escape Room: Fear, Flow, and Finale',
      slug: 'fear-flow-finale',
      excerpt:
        'A premium escape room isn’t just puzzles — it’s pacing, atmosphere, and a final act that lands like a movie ending.',
      content:
        'A great room has three layers working at once:\n\n1) Atmosphere — Lighting, sound, and set design that feels intentional.\n2) Flow — Each solution teaches you the “language” of the room.\n3) Finale — A last sequence that rewards teamwork and confidence.\n\nIf you ever feel stuck, it’s rarely because the puzzle is too hard — it’s usually because the room hasn’t taught you the next step yet.\n\nOur rule: every clue should either raise tension or release it. Never neutral.',
      featured_image: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=1400&q=80',
      published_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      is_published: true,
      views: 128,
      meta_title: null,
      meta_description: null,
      meta_keywords: null,
      author_name: 'DarkRoom',
    } as any,
    {
      id: 'demo-2',
      title: 'Beginner vs. Expert: Choosing the Right Room Difficulty',
      slug: 'choose-your-difficulty',
      excerpt:
        'Difficulty isn’t about intelligence — it’s about time pressure, misdirection, and how much the room asks you to notice.',
      content:
        'If you’re new, pick a room that teaches you:\n\n- How to search (without missing obvious cues)\n- How to communicate discoveries quickly\n- How to avoid “parallel play” (everyone doing the same task)\n\nIf you’re experienced, choose rooms with:\n\n- Multi-thread puzzle paths\n- Strong misdirection (fair, not cheap)\n- Time-sink decisions that punish hesitation\n\nThe best teams don’t solve faster — they decide faster.',
      featured_image: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1400&q=80',
      published_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
      is_published: true,
      views: 94,
      meta_title: null,
      meta_description: null,
      meta_keywords: null,
      author_name: 'DarkRoom',
    } as any,
    {
      id: 'demo-3',
      title: 'Team Roles That Win: The Quiet Tactician, The Hunter, The Solver',
      slug: 'team-roles-that-win',
      excerpt:
        'The fastest teams don’t have a genius — they have a system. Here’s a simple role split that works.',
      content:
        'Try this structure:\n\n- The Hunter: searches, collects, labels.\n- The Solver: stays on puzzles, doesn’t wander.\n- The Tactician: tracks objectives, keeps time, calls resets.\n\nRotate roles if someone stalls. The goal is momentum.\n\nSmall rule: if a clue is found, it must be announced out loud within 3 seconds.',
      featured_image: 'https://images.unsplash.com/photo-1500930287596-c1ecaa373b59?auto=format&fit=crop&w=1400&q=80',
      published_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 35).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 35).toISOString(),
      is_published: true,
      views: 77,
      meta_title: null,
      meta_description: null,
      meta_keywords: null,
      author_name: 'DarkRoom',
    } as any,
    {
      id: 'demo-4',
      title: 'What “Cinematic Horror” Means (Without Jump Scares)',
      slug: 'cinematic-horror-without-jumpscares',
      excerpt:
        'We build tension like a film: sound design, lighting, and story beats — not cheap shocks.',
      content:
        'Atmosphere is a contract.\n\nWe’ll make you feel watched. We’ll make the room breathe. We’ll make your team whisper.\n\nBut we avoid “gotcha” moments. The fear comes from:\n\n- Uncertainty\n- Time pressure\n- Consequences\n\nIf you finish and feel like you lived through a scene, we did our job.',
      featured_image: 'https://images.unsplash.com/photo-1506466010722-395aa2bef877?auto=format&fit=crop&w=1400&q=80',
      published_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 55).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 50).toISOString(),
      is_published: true,
      views: 152,
      meta_title: null,
      meta_description: null,
      meta_keywords: null,
      author_name: 'DarkRoom',
    } as any,
  ];

  const visiblePosts = posts.length > 0 ? posts : fallbackPosts;

  useEffect(() => {
    loadPageData();
  }, []);

  const mapFallbackPosts = (items: BlogFallbackPostItem[]): BlogPost[] =>
    items.map((item, index) => ({
      id: `fallback-${item.slug || index}`,
      title: item.title,
      slug: item.slug || `darkroom-story-${index + 1}`,
      excerpt: item.excerpt,
      content: item.content,
      featured_image: item.image_url || null,
      published_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * (index + 7)).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * Math.max(index + 3, 1)).toISOString(),
      is_published: true,
      views: 0,
      meta_title: null,
      meta_description: null,
      meta_keywords: null,
      author_name: item.author_name || 'DarkRoom',
    } as BlogPost));

  const loadPageData = async () => {
    try {
      const [postsResult, settingsResult] = await Promise.all([
        supabase
          .from('blog_posts')
          .select('*')
          .eq('is_published', true)
          .order('published_at', { ascending: false }),
        supabase
          .from('site_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['blog_hero_title', 'blog_hero_subtitle', 'blog_fallback_posts']),
      ]);

      if (postsResult.error) {
        console.error('Error fetching blog posts:', postsResult.error);
      } else {
        setPosts(postsResult.data || []);
      }

      if (settingsResult.error) {
        console.error('Error fetching blog settings:', settingsResult.error);
        setBlogHero({
          title: 'Blog',
          subtitle: 'Stories, tips, and insights from the world of escape rooms',
        });
        setFallbackPosts(defaultDemoPosts);
      } else {
        const settingsObj: Record<string, any> = {};
        settingsResult.data?.forEach((item: any) => {
          settingsObj[item.setting_key] = item.setting_value;
        });

        setBlogHero({
          title: settingsObj.blog_hero_title || 'Blog',
          subtitle: settingsObj.blog_hero_subtitle || 'Stories, tips, and insights from the world of escape rooms',
        });

        const configuredFallbackPosts = Array.isArray(settingsObj.blog_fallback_posts)
          ? settingsObj.blog_fallback_posts
          : [];
        setFallbackPosts(
          configuredFallbackPosts.length > 0
            ? mapFallbackPosts(configuredFallbackPosts)
            : defaultDemoPosts
        );
      }
    } catch (error) {
      console.error('Error loading blog page:', error);
      setFallbackPosts(defaultDemoPosts);
    } finally {
      setLoading(false);
    }
  };

  const handlePostClick = (slug: string) => {
    onNavigate(`/blog/${slug}`);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal-950 bg-horror-radial flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 shadow-red-glow"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal-950 bg-horror-radial">
      <div className="relative text-white py-16 border-b border-red-900/30 overflow-hidden">
        <div className="absolute inset-0 bg-black"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary-950/60 via-black to-black"></div>
        <div className="absolute inset-0 opacity-[0.12] bg-horror-grain" style={{ backgroundSize: '4px 4px' }}></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            <p className="text-primary-300 text-xs tracking-[0.35em] uppercase font-semibold mb-4">
              Journal
            </p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 font-display tracking-wide">{blogHero.title}</h1>
            <p className="text-lg md:text-xl text-slate-300 max-w-2xl">
              {blogHero.subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {visiblePosts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-300 text-lg">No blog posts available yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {visiblePosts.map((post) => (
              <article
                key={post.id}
                className="dr-card overflow-hidden cursor-pointer group block hover:border-primary-500/60 hover:shadow-red-glow transition-all duration-300"
              >
                <a
                  href={`/blog/${post.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handlePostClick(post.slug);
                  }}
                  className="block h-full"
                >
                {post.featured_image && (
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={getOptimizedImageUrl(safeImageUrl(post.featured_image), { width: 800, height: 500 })}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent opacity-100 transition-opacity duration-300" />
                  </div>
                )}

                <div className="p-6">
                  <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                    {post.published_at && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(post.published_at)}</span>
                      </div>
                    )}
                    {post.views && post.views > 0 && (
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{post.views} views</span>
                      </div>
                    )}
                  </div>

                  <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-primary-300 transition-colors line-clamp-2 font-display tracking-wide">
                    {post.title}
                  </h2>

                  {post.excerpt && (
                    <p className="text-slate-300 leading-relaxed line-clamp-3 mb-4">
                      {post.excerpt}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-red-900/30">
                    <span className="text-primary-300 font-semibold group-hover:text-primary-200 transition-colors">
                      Read More →
                    </span>
                    {post.content && (
                      <div className="flex items-center gap-1 text-sm text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span>{Math.ceil(post.content.length / 1000)} min read</span>
                      </div>
                    )}
                  </div>
                </div>
                </a>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
