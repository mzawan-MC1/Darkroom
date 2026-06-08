
function getSupabaseProjectIdFromEnv(): string | null {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return null;

  try {
    const hostname = new URL(supabaseUrl).hostname;
    const prefix = hostname.split('.')[0];
    return prefix || null;
  } catch {
    return null;
  }
}

const FALLBACK_SUPABASE_PROJECT_ID = 'xvmbtzwcchdbapqoywjf';

interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  resize?: 'cover' | 'contain' | 'fill';
}

/**
 * Optimizes a Supabase Storage URL (or Unsplash URL) by appending transformation parameters.
 * 
 * @param url The full URL of the image (e.g., from database).
 * @param options Optimization options (width, height, quality).
 * @returns The optimized URL.
 */
export function getOptimizedImageUrl(url: string | null | undefined, options: ImageOptions = {}): string {
  if (!url) return '';

  // Handle Supabase Storage URLs
  const projectId = getSupabaseProjectIdFromEnv() ?? FALLBACK_SUPABASE_PROJECT_ID;
  if (url.includes(projectId) && url.includes('/storage/v1/object/public/')) {
    const { width, height, quality = 80, resize = 'cover' } = options;
    const params = new URLSearchParams();

    if (width) params.append('width', width.toString());
    if (height) params.append('height', height.toString());
    params.append('quality', quality.toString());
    params.append('resize', resize);

    // If the URL already has query params, append to them, otherwise start new
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${params.toString()}`;
  }

  // Handle Unsplash URLs (common fallback/placeholder)
  if (url.includes('images.unsplash.com')) {
    const { width, height, quality = 80 } = options;
    // Unsplash uses 'w', 'h', 'q'
    const params = new URLSearchParams();
    if (width) params.append('w', width.toString());
    if (height) params.append('h', height.toString());
    params.append('q', quality.toString());
    params.append('auto', 'format'); // Auto format (webp/avif)
    
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${params.toString()}`;
  }

  return url;
}
