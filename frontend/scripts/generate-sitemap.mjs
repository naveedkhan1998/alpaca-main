// Simple sitemap and robots generator without external deps
// Reads VITE_SITE_URL if set, otherwise falls back to window-like origin default
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

const SITE_URL = (
  process.env.VITE_SITE_URL || 'https://alpaca.mnaveedk.com'
).replace(/\/$/, '');
const PUBLIC_DIR = resolve(process.cwd(), 'public');

// Public, indexable routes
const PUBLIC_ROUTES = [
  '/',
  '/app/login',
  '/app/privacy',
  '/app/terms',
  '/app/contact',
];

// Private routes to disallow in robots
const PRIVATE_PATTERNS = [
  '/app/accounts',
  '/app/profile',
  '/app/instruments/',
  '/app/graphs/',
  '/app/watchlists/',
];

function xmlEscape(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function ensureDir(path) {
  try {
    await mkdir(path, { recursive: true });
  } catch {}
}

async function generateSitemap() {
  const urls = PUBLIC_ROUTES.map(route => {
    const loc = `${SITE_URL}${route}`;
    let changefreq = 'monthly';
    let priority = '0.5';
    if (route === '/') {
      changefreq = 'weekly';
      priority = '1.0';
    } else if (route.includes('privacy') || route.includes('terms')) {
      changefreq = 'yearly';
      priority = '0.4';
    }
    return `  <url>\n    <loc>${xmlEscape(loc)}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  await ensureDir(PUBLIC_DIR);
  await writeFile(resolve(PUBLIC_DIR, 'sitemap.xml'), xml, 'utf8');
}

async function generateRobots() {
  const lines = [
    'User-agent: *',
    '# Allow the public landing page and key public routes',
    'Allow: /',
    'Allow: /app/login',
    'Allow: /app/privacy',
    'Allow: /app/terms',
    'Allow: /app/contact',
    '',
    '# Disallow private/authenticated app areas',
    ...PRIVATE_PATTERNS.map(p => `Disallow: ${p}`),
    '',
    '# Update this if you deploy to a different domain',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ];

  await ensureDir(PUBLIC_DIR);
  await writeFile(resolve(PUBLIC_DIR, 'robots.txt'), lines.join('\n'), 'utf8');
}

try {
  await generateSitemap();
  await generateRobots();
  console.log(`[seo] Generated sitemap and robots for ${SITE_URL}`);
} catch (err) {
  console.error('[seo] Failed to generate SEO files', err);
  process.exit(1);
}
