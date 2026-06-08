import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Star, MapPin, ExternalLink, MessageSquare, Quote } from 'lucide-react';

interface GoogleReview {
  id: string;
  author_name: string;
  rating: number;
  text: string;
  relative_time: string;
  profile_photo_url: string;
  google_review_url: string;
}

interface GoogleRating {
  avg_rating: number;
  total_reviews: number;
}

interface GoogleSettings {
  is_active: boolean;
  place_id: string;
  google_maps_url: string;
  write_review_url: string;
}

export default function GoogleReviewsSection() {
  const [settings, setSettings] = useState<GoogleSettings | null>(null);
  const [rating, setRating] = useState<GoogleRating | null>(null);
  const [reviews, setReviews] = useState<GoogleReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 1. Fetch Settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('google_integration_settings')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (settingsError || !settingsData) {
        setLoading(false);
        return;
      }

      setSettings(settingsData);

      // 2. Fetch Rating
      const { data: ratingData } = await supabase
        .from('google_rating_cache')
        .select('*')
        .eq('place_id', settingsData.place_id)
        .maybeSingle();

      if (ratingData) {
        setRating(ratingData);
      }

      // 3. Fetch Reviews
      const { data: reviewsData } = await supabase
        .from('google_reviews_cache')
        .select('*')
        .eq('place_id', settingsData.place_id)
        .order('time', { ascending: false })
        .limit(6);

      if (reviewsData) {
        setReviews(reviewsData);
      }
    } catch (error) {
      console.error('Error fetching Google Reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null; // Or a skeleton
  if (!settings) return null; // Integration disabled

  return (
    <section className="py-20 bg-black relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.05),transparent_70%)] pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-white/80 border border-white/10 uppercase tracking-wider flex items-center gap-2">
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-4 h-4" />
              Official Reviews
            </span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 uppercase tracking-tight">
            What Our Players Say
          </h2>
          
          {rating && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-4 bg-white/5 px-6 py-3 rounded-2xl border border-white/10 backdrop-blur-sm">
                <span className="text-4xl font-bold text-white">{rating.avg_rating.toFixed(1)}</span>
                <div className="flex flex-col items-start">
                  <div className="flex text-yellow-400 gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-5 h-5 ${i < Math.round(rating.avg_rating) ? 'fill-current' : 'text-gray-600 fill-gray-600'}`} 
                      />
                    ))}
                  </div>
                  <span className="text-sm text-slate-400">{rating.total_reviews} Google Reviews</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {reviews.map((review) => (
            <div 
              key={review.id} 
              className="bg-zinc-900/50 border border-white/10 rounded-xl p-6 hover:border-primary-500/30 hover:bg-zinc-900/80 transition-all duration-300 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {review.profile_photo_url ? (
                    <img 
                      src={review.profile_photo_url} 
                      alt={review.author_name} 
                      className="w-10 h-10 rounded-full object-cover border border-white/10"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-500 font-bold border border-primary-500/20">
                      {review.author_name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold text-white text-sm line-clamp-1">{review.author_name}</h4>
                    <span className="text-xs text-slate-500">{review.relative_time}</span>
                  </div>
                </div>
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-5 h-5 opacity-50 grayscale group-hover:grayscale-0 transition-all" />
              </div>

              <div className="flex text-yellow-400 gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'text-zinc-700 fill-zinc-700'}`} 
                  />
                ))}
              </div>

              <div className="relative">
                <Quote className="absolute -top-1 -left-1 w-6 h-6 text-white/5 transform -scale-x-100" />
                <p className="text-slate-300 text-sm leading-relaxed line-clamp-4 pl-2">
                  {review.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {settings.google_maps_url && (
            <a
              href={settings.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-8 py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg border border-white/10 transition-all hover:scale-105"
            >
              <MapPin className="w-4 h-4" />
              View on Google Maps
              <ExternalLink className="w-3 h-3 ml-1 opacity-50" />
            </a>
          )}
          
          {settings.write_review_url && (
            <a
              href={settings.write_review_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg shadow-lg shadow-primary-900/20 transition-all hover:scale-105"
            >
              <MessageSquare className="w-4 h-4" />
              Write a Review
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
