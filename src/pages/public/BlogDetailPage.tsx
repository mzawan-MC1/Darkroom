import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getOptimizedImageUrl } from '../../lib/media';
import { Calendar, Clock, Eye, ArrowLeft } from 'lucide-react';
import SEOHead from '../../components/SEOHead';
import type { Database } from '../../lib/database.types';

type BlogPost = Database['public']['Tables']['blog_posts']['Row'];

interface BlogDetailPageProps {
  slug: string;
  onNavigate: (page: string) => void;
}

export default function BlogDetailPage({ slug, onNavigate }: BlogDetailPageProps) {
  const [post, setPost] = useState<BlogPost | null>(null);
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

  const demoPostsBySlug: Record<string, BlogPost> = {
    'fear-flow-finale': {
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
    'choose-your-difficulty': {
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
    'team-roles-that-win': {
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
    'cinematic-horror-without-jumpscares': {
      id: 'demo-4',
      title: 'What “Cinematic Horror” Means (Without Jump Scares)',
      slug: 'cinematic-horror-without-jumpscares',
      excerpt: 'We build tension like a film: sound design, lighting, and story beats — not cheap shocks.',
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
  };

  useEffect(() => {
    if (slug) {
      fetchPost(slug);
    }
  }, [slug]);

  const fetchPost = async (slug: string) => {
    try {
      const { data: rawData, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (error) throw error;

      if (rawData) {
        const data = rawData as BlogPost;
        setPost(data);
        incrementViews(data.id, data.views || 0);
      } else if (demoPostsBySlug[slug]) {
        setPost(demoPostsBySlug[slug]);
      }
    } catch (error) {
      console.error('Error fetching blog post:', error);
      if (demoPostsBySlug[slug]) {
        setPost(demoPostsBySlug[slug]);
      }
    } finally {
      setLoading(false);
    }
  };

  const incrementViews = async (postId: string, currentViews: number) => {
    try {
      await (supabase.from('blog_posts') as any)
        .update({ views: currentViews + 1 })
        .eq('id', postId);
    } catch (error) {
      console.error('Error incrementing views:', error);
    }
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

  if (!post) {
    return (
      <div className="min-h-screen bg-charcoal-950 bg-horror-radial flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4 font-display tracking-wide">Post Not Found</h1>
          <p className="text-slate-300 mb-6">The blog post you're looking for doesn't exist.</p>
          <button
            onClick={() => onNavigate('blog')}
            className="dr-btn-primary px-6 py-3"
          >
            Back to Blog
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title={post.meta_title || post.title}
        description={post.meta_description || post.excerpt || ''}
        keywords={Array.isArray(post.meta_keywords) ? post.meta_keywords.join(', ') : ''}
      />
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": post.title,
          "image": post.featured_image || "https://thelockout.ae/logo.png",
          "author": {
            "@type": "Organization",
            "name": "LockOut Escape Room"
          },
          "publisher": {
            "@type": "Organization",
            "name": "LockOut Escape Room",
            "logo": {
              "@type": "ImageObject",
              "url": "https://thelockout.ae/logo.png"
            }
          },
          "datePublished": post.published_at || new Date().toISOString(),
          "dateModified": post.updated_at || new Date().toISOString(),
          "description": post.meta_description || post.excerpt || post.title
        })}
      </script>

      <div className="min-h-screen bg-charcoal-950 bg-horror-radial">
        {post.featured_image && (
          <div className="relative h-96 overflow-hidden">
            <img
              src={getOptimizedImageUrl(safeImageUrl(post.featured_image), { width: 1200, quality: 80 })}
              alt={post.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
            <div className="absolute inset-0 opacity-[0.10] bg-horror-grain" style={{ backgroundSize: '4px 4px' }}></div>
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <div className="max-w-4xl mx-auto">
                <button
                  onClick={() => onNavigate('blog')}
                  className="inline-flex items-center gap-2 text-slate-200 hover:text-primary-300 transition-colors mb-4"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back to Blog
                </button>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 font-display tracking-wide">
                  {post.title}
                </h1>
              </div>
            </div>
          </div>
        )}

        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {!post.featured_image && (
            <>
              <button
                onClick={() => onNavigate('blog')}
                className="inline-flex items-center gap-2 text-slate-300 hover:text-primary-300 transition-colors mb-6"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Blog
              </button>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 font-display tracking-wide">
                {post.title}
              </h1>
            </>
          )}

          <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400 mb-8 pb-8 border-b border-red-900/30">
            {post.published_at && (
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span>{formatDate(post.published_at)}</span>
              </div>
            )}
            {post.views && post.views > 0 && (
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                <span>{post.views} views</span>
              </div>
            )}
            {post.content && (
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>{Math.ceil(post.content.length / 1000)} min read</span>
              </div>
            )}
          </div>

          {post.excerpt && (
            <div className="dr-card p-6 mb-8 border-l-4 border-l-primary-500/80">
              <p className="text-lg text-slate-200 leading-relaxed italic">
                {post.excerpt}
              </p>
            </div>
          )}

          <div className="max-w-none">
            <div className="text-slate-200 leading-relaxed whitespace-pre-wrap">
              {post.content}
            </div>
          </div>

          {/* Tags intentionally hidden for customers */}

          <div className="mt-12 pt-8 border-t border-red-900/30">
            <button
              onClick={() => onNavigate('blog')}
              className="inline-flex items-center gap-2 text-primary-300 hover:text-primary-200 font-semibold transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to all posts
            </button>
          </div>
        </article>
      </div>
    </>
  );
}
