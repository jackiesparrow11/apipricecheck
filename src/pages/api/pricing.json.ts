import type { APIRoute } from 'astro';
import { getAllModels } from '../../data/models';

export const GET: APIRoute = async () => {
  const models = getAllModels();
  const payload = {
    meta: {
      title: 'Global AI API Pricing Dataset',
      updatedAt: new Date().toISOString(),
      modelsCount: models.length,
      license: 'https://creativecommons.org/licenses/by/4.0/',
      attribution: 'APIPriceCheck (https://apipricecompare.com)',
      documentation: 'https://apipricecompare.com/api/pricing.json',
    },
    data: models,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
