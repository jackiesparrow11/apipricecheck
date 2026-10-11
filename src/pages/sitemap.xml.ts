import type { APIRoute } from 'astro';
import { getProvidersList } from '../data/models';

export const GET: APIRoute = async () => {
  const siteUrl = 'https://apipricecompare.com';
  const today = new Date().toISOString().split('T')[0];
  const providers = getProvidersList();

  const staticRoutes = [
    { url: `${siteUrl}/`, priority: '1.0', changefreq: 'daily' },
    { url: `${siteUrl}/calculators/token-cost/`, priority: '0.9', changefreq: 'weekly' },
    { url: `${siteUrl}/cheapest-llm-api/`, priority: '0.9', changefreq: 'daily' },
    { url: `${siteUrl}/api/pricing.json`, priority: '0.8', changefreq: 'daily' },
  ];

  const providerRoutes = providers.map((p) => ({
    url: `${siteUrl}/pricing/${p.id}/`,
    priority: '0.8',
    changefreq: 'weekly',
  }));

  const allRoutes = [...staticRoutes, ...providerRoutes];

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes
  .map(
    (r) => `  <url>
    <loc>${r.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(sitemapXml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
