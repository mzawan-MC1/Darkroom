import { Target, Heart, Users, Award, Clock, Shield } from 'lucide-react';
import SEOHead from '../../components/SEOHead';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface AboutPageProps {
  onNavigate: (page: string) => void;
}

export default function AboutPage({ onNavigate }: AboutPageProps) {
  const [s, setS] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'about_enabled',
          'about_title',
          'about_subtitle',
          'about_story_title',
          'about_story_content',
          'about_mission_title',
          'about_mission_content',
          'about_vision_title',
          'about_vision_content',
          'about_values',
          'about_media_type',
          'about_media_url',
          'about_media_poster_url',
          'about_media_alt',
        ]);
      const obj: any = {};
      data?.forEach((it: any) => { obj[it.setting_key] = it.setting_value; });
      setS(obj);
    };
    load();
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

  const aboutValues = Array.isArray(s?.about_values) && s.about_values.length > 0
    ? s.about_values
    : [
        {
          title: 'Excellence',
          description: 'We obsess over detail so every room feels premium from entry to finale.',
          icon: 'Target',
        },
        {
          title: 'Atmosphere',
          description: 'Every sound cue, prop, and lighting change exists to deepen immersion.',
          icon: 'Heart',
        },
        {
          title: 'Teamwork',
          description: 'We design for shared adrenaline, collaboration, and unforgettable memories.',
          icon: 'Users',
        },
      ];

  const valueIcons: Record<string, any> = { Target, Heart, Users, Award, Clock, Shield };

  return (
    <div className="min-h-screen bg-charcoal-950 bg-horror-radial pt-24 pb-12">
      <SEOHead
        pageIdentifier="about"
        fallbackTitle="About Us - Escape Room"
        fallbackDescription="Learn about our story and mission. Dubai's premier destination for immersive escape room experiences."
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {(s?.about_enabled ?? true) && (
          <div className="text-center mb-16">
            <p className="text-primary-300 text-xs tracking-[0.35em] uppercase font-semibold mb-4">
              Behind the Curtain
            </p>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">{s?.about_title || 'About Us'}</h1>
            {s?.about_subtitle && (
              <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto">{s.about_subtitle}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <h2 className="text-3xl font-bold text-white mb-6 font-display tracking-wide">{s?.about_story_title || 'Our Story'}</h2>
            {s?.about_story_content ? (
              <div className="text-lg text-slate-300 whitespace-pre-line">{s.about_story_content}</div>
            ) : (
              <div className="text-lg text-slate-300 space-y-4 whitespace-pre-line">
                <p>
                  DarkRoom was built for teams who want more than puzzles — you want atmosphere, story, and the thrill of
                  racing the clock while the lights flicker and the door locks behind you.
                </p>
                <p>
                  Every room is designed like a film set: layered audio, cinematic lighting, tactile props, and a
                  narrative that pulls you deeper with every solved clue.
                </p>
                <p>
                  Whether you’re celebrating, team-building, or chasing the perfect adrenaline rush, our game masters
                  guide the experience so it feels intense, premium, and unforgettable.
                </p>
              </div>
            )}
          </div>
          <div className="relative">
            <div className="aspect-w-16 aspect-h-9 dr-card overflow-hidden">
              {s?.about_media_type === 'video' && s?.about_media_url ? (
                <video
                  src={s.about_media_url}
                  controls
                  poster={s.about_media_poster_url || ''}
                  className="w-full h-full object-cover"
                />
              ) : s?.about_media_url ? (
                <img
                  src={safeImageUrl(s.about_media_url)}
                  alt={s.about_media_alt || 'About media'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src="https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=1200&q=80"
                  alt="About"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          <div className="dr-panel p-8 hover:border-primary-500/60 hover:shadow-red-glow transition-all">
            <div className="w-14 h-14 bg-primary-500/10 rounded-2xl flex items-center justify-center mb-5 shadow-red-glow">
              <Target className="w-7 h-7 text-primary-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4 font-display tracking-wide">
              {s?.about_mission_title || 'Our Mission'}
            </h2>
            <p className="text-slate-300 leading-relaxed">
              {s?.about_mission_content || 'To create cinematic escape-room experiences where story, tension, and teamwork come together in a way players remember long after the final lock opens.'}
            </p>
          </div>
          <div className="dr-panel p-8 hover:border-primary-500/60 hover:shadow-red-glow transition-all">
            <div className="w-14 h-14 bg-primary-500/10 rounded-2xl flex items-center justify-center mb-5 shadow-red-glow">
              <Award className="w-7 h-7 text-primary-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4 font-display tracking-wide">
              {s?.about_vision_title || 'Our Vision'}
            </h2>
            <p className="text-slate-300 leading-relaxed">
              {s?.about_vision_content || 'To become the benchmark for premium horror escape entertainment in the region, blending immersive set design with precise, story-led puzzle flow.'}
            </p>
          </div>
        </div>

        <div className="mb-20">
          <h2 className="text-3xl font-bold text-white text-center mb-12 font-display tracking-wide">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {aboutValues.map((value: any, index: number) => {
              const Icon = valueIcons[value.icon] || Target;
              return (
                <div key={index} className="text-center p-6 dr-card hover:border-primary-500/60 hover:shadow-red-glow transition-all">
                  <div className="w-16 h-16 bg-primary-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-red-glow">
                    <Icon className="w-8 h-8 text-primary-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{value.title}</h3>
                  <p className="text-slate-300">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="dr-panel p-8 md:p-12 mb-20 hover:border-primary-500/60 hover:shadow-red-glow transition-all">
          <h2 className="text-3xl font-bold text-white text-center mb-12 font-display tracking-wide">Why Choose Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center shadow-red-glow">
                  <Award className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Award-Winning Design</h3>
                <p className="text-slate-300">
                  Our escape rooms have won multiple awards for innovation, design, and storytelling excellence.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center shadow-red-glow">
                  <Shield className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Safety First</h3>
                <p className="text-slate-300">
                  All rooms are monitored 24/7 with emergency protocols in place to ensure your complete safety.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center shadow-red-glow">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Expert Game Masters</h3>
                <p className="text-slate-300">
                  Our trained game masters ensure smooth gameplay and are always ready to provide hints when needed.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center shadow-red-glow">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Flexible Scheduling</h3>
                <p className="text-slate-300">
                  Book your preferred time slot with our easy online booking system. Open 7 days a week.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="dr-panel p-8 md:p-12 text-center text-white hover:border-primary-500/60 hover:shadow-red-glow transition-all">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Your Adventure?</h2>
          <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Join thousands of players who’ve experienced the thrill of a true cinematic escape room
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onNavigate('games')}
              className="dr-btn-ghost px-8 py-4"
            >
              Browse Games
            </button>
            <button
              onClick={() => onNavigate('book')}
              className="dr-btn-primary px-8 py-4"
            >
              Book Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
