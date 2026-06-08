// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      throw new Error('GOOGLE_PLACES_API_KEY is not set');
    }

    // 1. Fetch active settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('google_integration_settings')
      .select('place_id')
      .eq('is_active', true)
      .maybeSingle();

    if (settingsError) throw settingsError;
    if (!settings) {
      return new Response(JSON.stringify({ message: 'No active Google Place ID found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const placeId = settings.place_id;
    console.log(`Syncing reviews for Place ID: ${placeId}`);

    // 2. Call Google Places API
    // Request fields: rating, user_ratings_total, reviews
    const fields = 'rating,user_ratings_total,reviews';
    const googleUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
    
    const googleResponse = await fetch(googleUrl);
    const googleData = await googleResponse.json();

    if (googleData.status !== 'OK') {
      throw new Error(`Google API Error: ${googleData.status} - ${googleData.error_message || ''}`);
    }

    const result = googleData.result;

    // 3. Upsert Rating Cache
    const ratingData = {
      place_id: placeId,
      avg_rating: result.rating,
      total_reviews: result.user_ratings_total,
      updated_at: new Date().toISOString(),
    };

    const { error: ratingError } = await supabaseClient
      .from('google_rating_cache')
      .upsert(ratingData);

    if (ratingError) throw ratingError;

    // 4. Update Reviews Cache
    // Clear old reviews for this place_id to ensure cache freshness
    const { error: deleteError } = await supabaseClient
      .from('google_reviews_cache')
      .delete()
      .eq('place_id', placeId);
      
    if (deleteError) throw deleteError;

    if (result.reviews && result.reviews.length > 0) {
      const reviewsToInsert = result.reviews.map((review: any) => ({
        place_id: placeId,
        author_name: review.author_name,
        rating: review.rating,
        text: review.text,
        relative_time: review.relative_time_description,
        time: new Date(review.time * 1000).toISOString(),
        profile_photo_url: review.profile_photo_url,
        google_review_url: review.author_url, // Closest match, usually links to review
        raw: review,
      }));

      const { error: insertError } = await supabaseClient
        .from('google_reviews_cache')
        .insert(reviewsToInsert);

      if (insertError) throw insertError;
    }

    return new Response(JSON.stringify({ success: true, message: 'Google Reviews synced successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error syncing Google Reviews:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
