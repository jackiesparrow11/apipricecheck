/**
 * scripts/sync-pricing.ts
 *
 * Automated Pricing Synchronization Engine for apipricecheck.com
 * Sources:
 *  1. models.dev (https://models.dev/api.json) — Official preset used by New API (8,400+ models, 220+ providers)
 *  2. OpenRouter (https://openrouter.ai/api/v1/models) — Real-time token pricing from multi-cloud aggregators
 *
 * Usage:
 *  bun run sync-data
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import type { ModelRecord, HostingOffer } from '../src/data/types';

interface OpenRouterModel {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
    input_cache_read?: string;
  };
  context_length: number;
}

interface ModelsDevCost {
  input?: number;
  output?: number;
  cache_read?: number;
}

interface ModelsDevModel {
  id: string;
  name: string;
  description?: string;
  limit?: { context?: number; output?: number };
  cost?: ModelsDevCost;
}

interface ModelsDevProvider {
  models?: Record<string, ModelsDevModel>;
}

async function syncPricing() {
  console.log('🔄 Starting Automated Pricing Sync...');
  console.log('  ➔ Preset 1: models.dev (New API upstream standard)');
  console.log('  ➔ Preset 2: OpenRouter API (Live aggregator rates)\n');

  const dataPath = resolve(__dirname, '../src/data/models.json');
  const localModels: ModelRecord[] = JSON.parse(readFileSync(dataPath, 'utf-8'));
  const today = new Date().toISOString().split('T')[0];

  let openrouterUpdated = 0;
  let modelsDevMatched = 0;

  // 1. Fetch OpenRouter
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    if (res.ok) {
      const json = (await res.json()) as { data: OpenRouterModel[] };
      const remoteModels = json.data;
      console.log(`✅ Loaded ${remoteModels.length} models from OpenRouter.`);

      for (const model of localModels) {
        const remote = remoteModels.find(
          (r) =>
            r.id === model.id ||
            r.id.endsWith(`/${model.id}`) ||
            r.id.toLowerCase().includes(model.id.toLowerCase())
        );

        if (remote && remote.pricing) {
          const promptPerM = Number((parseFloat(remote.pricing.prompt) * 1_000_000).toFixed(4));
          const completionPerM = Number((parseFloat(remote.pricing.completion) * 1_000_000).toFixed(4));
          const cacheReadPerM = remote.pricing.input_cache_read
            ? Number((parseFloat(remote.pricing.input_cache_read) * 1_000_000).toFixed(4))
            : undefined;

          if (promptPerM > 0 || completionPerM > 0) {
            if (!model.hostingOffers) model.hostingOffers = [];

            const existingOffer = model.hostingOffers.find((h) => h.hostId === 'openrouter');
            if (existingOffer) {
              existingOffer.inputPerM = promptPerM;
              existingOffer.outputPerM = completionPerM;
              if (cacheReadPerM !== undefined) existingOffer.cachedInputPerM = cacheReadPerM;
              existingOffer.status = 'active';
            } else {
              model.hostingOffers.push({
                hostId: 'openrouter',
                hostName: 'OpenRouter',
                hostType: 'aggregator',
                inputPerM: promptPerM,
                outputPerM: completionPerM,
                cachedInputPerM: cacheReadPerM,
                status: 'active',
                outboundUrl: `https://openrouter.ai/${remote.id}`,
              });
            }
            model.lastVerifiedAt = today;
            openrouterUpdated++;
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('⚠️ OpenRouter sync skipped:', err.message);
  }

  // 2. Fetch models.dev (New API preset)
  try {
    const res = await fetch('https://models.dev/api.json');
    if (res.ok) {
      const upstreamData = (await res.json()) as Record<string, ModelsDevProvider>;
      const providerCount = Object.keys(upstreamData).length;
      console.log(`✅ Loaded ${providerCount} providers from models.dev.`);

      for (const model of localModels) {
        // Search across providers in models.dev
        for (const [providerKey, provData] of Object.entries(upstreamData)) {
          if (!provData?.models) continue;

          for (const [mKey, devModel] of Object.entries(provData.models)) {
            const matchesId =
              mKey.toLowerCase() === model.id.toLowerCase() ||
              devModel.id?.toLowerCase() === model.id.toLowerCase() ||
              mKey.toLowerCase().endsWith(`/${model.id.toLowerCase()}`);

            if (matchesId && devModel.cost?.input !== undefined) {
              // Found matching candidate in models.dev
              modelsDevMatched++;
              if (model.status === 'preview' && devModel.cost.input > 0) {
                // If local is preview/unverified, calibrate with models.dev official cost
                model.officialPricing.inputPerM = devModel.cost.input;
                if (devModel.cost.output !== undefined) {
                  model.officialPricing.outputPerM = devModel.cost.output;
                }
                if (devModel.cost.cache_read !== undefined) {
                  model.officialPricing.cachedInputPerM = devModel.cost.cache_read;
                }
              }
              break;
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('⚠️ models.dev sync skipped:', err.message);
  }

  writeFileSync(dataPath, JSON.stringify(localModels, null, 2), 'utf-8');
  console.log('\n===============================================================');
  console.log(`🎉 Sync Completed!`);
  console.log(`   • OpenRouter offers updated: ${openrouterUpdated}`);
  console.log(`   • models.dev cross-referenced: ${modelsDevMatched}`);
  console.log('===============================================================\n');
}

syncPricing();
