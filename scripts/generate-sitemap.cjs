
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = 'https://thelockout.ae';

function escapeXml(value) {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function generateSitemap() {
  console.log('Generating sitemap...');

  const urls = [
    { loc: '/', changefreq: 'daily', priority: 1.0 },
    { loc: '/games', changefreq: 'weekly', priority: 0.9 },
    { loc: '/lobby-games', changefreq: 'weekly', priority: 0.8 },
    { loc: '/merchandise', changefreq: 'weekly', priority: 0.8 },
    { loc: '/blog', changefreq: 'weekly', priority: 0.7 },
    { loc: '/about', changefreq: 'monthly', priority: 0.6 },
    { loc: '/contact', changefreq: 'monthly', priority: 0.6 },
    { loc: '/order-video', changefreq: 'monthly', priority: 0.5 },
    { loc: '/book', changefreq: 'always', priority: 0.9 },
    { loc: '/login', changefreq: 'monthly', priority: 0.4 },
  ];

  try {
    // Fetch Games
    const { data: games } = await supabase
      .from('games')
      .select('slug, updated_at');
    
    if (games) {
      games.forEach((game) => {
        if (game.slug) {
          urls.push({
            loc: `/game/${game.slug}`,
            lastmod: game.updated_at,
            changefreq: 'weekly',
            priority: 0.9
          });
        }
      });
    }

    // Fetch Blog Posts
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('slug, updated_at')
      .eq('is_published', true);

    if (posts) {
      posts.forEach((post) => {
        if (post.slug) {
          urls.push({
            loc: `/blog/${post.slug}`,
            lastmod: post.updated_at,
            changefreq: 'monthly',
            priority: 0.7
          });
        }
      });
    }

    // Fetch Static Pages
    const { data: pages } = await supabase
      .from('static_pages')
      .select('slug, updated_at')
      .eq('is_published', true);

    if (pages) {
      pages.forEach((page) => {
        if (page.slug) {
          urls.push({
            loc: `/page/${page.slug}`,
            lastmod: page.updated_at,
            changefreq: 'monthly',
            priority: 0.6
          });
        }
      });
    }

    // Generate XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${escapeXml(`${BASE_URL}${url.loc}`)}</loc>
    ${url.lastmod ? `<lastmod>${new Date(url.lastmod).toISOString()}</lastmod>` : ''}
    <changefreq>${url.changefreq || 'monthly'}</changefreq>
    <priority>${url.priority || 0.5}</priority>
  </url>`).join('\n')}
</urlset>`;

    const publicDir = path.resolve(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir);
    }

    fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
    console.log(`Sitemap generated with ${urls.length} URLs at public/sitemap.xml`);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    process.exit(1);
  }
}

generateSitemap().catch(console.error);
