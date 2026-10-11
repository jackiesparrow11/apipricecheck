/**
 * scripts/update-latest-models.ts
 *
 * Ingests latest models and pricing from:
 * 1. models.dev API (226 providers, 8,400+ models)
 * 2. OpenRouter API (450+ models)
 * 3. Verified Official Production Benchmarks
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import type { ModelRecord, HostingOffer } from '../src/data/types';

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
  status?: string;
  release_date?: string;
  reasoning?: boolean;
}

interface ModelsDevProvider {
  name: string;
  models?: Record<string, ModelsDevModel>;
}

// Canonical Creator mappings
const CREATOR_MAP: Record<string, { id: string; name: string }> = {
  openai: { id: 'openai', name: 'OpenAI (GPT)' },
  anthropic: { id: 'anthropic', name: 'Anthropic (Claude)' },
  google: { id: 'google', name: 'Google (Gemini)' },
  deepseek: { id: 'deepseek', name: 'DeepSeek' },
  xai: { id: 'xai', name: 'xAI (Grok)' },
  meta: { id: 'meta', name: 'Meta (Llama)' },
  alibaba: { id: 'alibaba', name: 'Alibaba (Qwen)' },
  mistral: { id: 'mistral', name: 'Mistral AI' },
  cohere: { id: 'cohere', name: 'Cohere' },
  perplexity: { id: 'perplexity', name: 'Perplexity' },
  zhipu: { id: 'zhipu', name: 'Zhipu AI (GLM / Z.ai)' },
  moonshot: { id: 'moonshot', name: 'Moonshot AI (Kimi)' },
  minimax: { id: 'minimax', name: 'MiniMax' },
};

async function updateLatestModels() {
  console.log('🚀 Ingesting latest models and pricing from models.dev & OpenRouter...');

  const dataPath = resolve(__dirname, '../src/data/models.json');
  const existingModels: ModelRecord[] = JSON.parse(readFileSync(dataPath, 'utf-8'));
  const modelMap = new Map<string, ModelRecord>();

  // 1. Index existing verified models
  for (const m of existingModels) {
    modelMap.set(m.id, m);
  }

  // 2. Fetch models.dev
  let modelsDevCount = 0;
  try {
    const res = await fetch('https://models.dev/api.json');
    if (res.ok) {
      const data = (await res.json()) as Record<string, ModelsDevProvider>;

      for (const [provKey, provData] of Object.entries(data)) {
        const creatorInfo = CREATOR_MAP[provKey.toLowerCase()];
        if (!creatorInfo || !provData.models) continue;

        for (const [mKey, mData] of Object.entries(provData.models)) {
          if (!mData.cost || mData.cost.input === undefined) continue;

          const rawId = mKey.toLowerCase().replace(/[^a-z0-9_.-]/g, '-');
          const cleanId = rawId.includes('/') ? rawId.split('/').pop()! : rawId;
          const inputCost = Number(mData.cost.input.toFixed(4));
          const outputCost = Number((mData.cost.output ?? inputCost * 2).toFixed(4));
          const cacheCost = mData.cost.cache_read !== undefined ? Number(mData.cost.cache_read.toFixed(4)) : inputCost * 0.5;

          const contextWin = mData.limit?.context || 128000;
          const maxOut = mData.limit?.output || 8192;

          let tier: 'Budget' | 'Mid' | 'Flagship' | 'Reasoning' = 'Mid';
          if (mData.reasoning || cleanId.includes('r1') || cleanId.includes('o1') || cleanId.includes('o3') || cleanId.includes('thinking')) {
            tier = 'Reasoning';
          } else if (inputCost <= 0.2) {
            tier = 'Budget';
          } else if (inputCost >= 2.0) {
            tier = 'Flagship';
          }

          if (modelMap.has(cleanId)) {
            // Update pricing & context for existing model if verified
            const existing = modelMap.get(cleanId)!;
            // Only update official pricing if not already locked by high-priority canonical rule
            if (existing.status === 'preview' || existing.officialPricing.inputPerM === 0) {
              existing.officialPricing.inputPerM = inputCost;
              existing.officialPricing.outputPerM = outputCost;
              existing.officialPricing.cachedInputPerM = cacheCost;
            }
            if (!existing.contextWindow || existing.contextWindow < contextWin) {
              existing.contextWindow = contextWin;
            }
          } else {
            // Add new model candidate from models.dev
            const newModel: ModelRecord = {
              id: cleanId,
              name: mData.name || cleanId,
              family: creatorInfo.name,
              creator: creatorInfo.id,
              creatorName: creatorInfo.name,
              provider: creatorInfo.id,
              providerName: `${creatorInfo.name} API`,
              contextWindow: contextWin,
              maxOutputTokens: maxOut,
              description: mData.description || `State-of-the-art ${mData.name || cleanId} model by ${creatorInfo.name}.`,
              tier,
              isFlagship: inputCost >= 2.0,
              isCheapestInTier: inputCost <= 0.05,
              officialPricing: {
                inputPerM: inputCost,
                cachedInputPerM: cacheCost,
                outputPerM: outputCost,
              },
              hostingOffers: [],
              status: mData.status === 'deprecated' ? 'deprecated' : 'active',
              releasedAt: mData.release_date || '2025-01-01',
              lastVerifiedAt: new Date().toISOString().split('T')[0],
            };
            modelMap.set(cleanId, newModel);
            modelsDevCount++;
          }
        }
      }
      console.log(`✅ Ingested / refreshed ${modelsDevCount} models from models.dev.`);
    }
  } catch (err: any) {
    console.warn('⚠️ models.dev fetch error:', err.message);
  }

  // 3. Fetch OpenRouter to ensure active hosting offers
  let openrouterCount = 0;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    if (res.ok) {
      const json = await res.json();
      const openRouterModels = json.data as Array<{
        id: string;
        name: string;
        pricing: { prompt: string; completion: string; input_cache_read?: string };
      }>;

      for (const [mId, model] of modelMap.entries()) {
        const remote = openRouterModels.find(
          (r) =>
            r.id.toLowerCase() === mId ||
            r.id.toLowerCase().endsWith(`/${mId}`) ||
            r.id.toLowerCase().includes(mId)
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
            openrouterCount++;
          }
        }
      }
      console.log(`✅ Attached / updated ${openrouterCount} hosting offers from OpenRouter.`);
    }
  } catch (err: any) {
    console.warn('⚠️ OpenRouter fetch error:', err.message);
  }

  // 4. Lock and ensure top production flagships are 100% accurate
  const flagships = [
    {
      id: 'claude-3-7-sonnet',
      name: 'Claude 3.7 Sonnet',
      creator: 'anthropic',
      creatorName: 'Anthropic (Claude)',
      input: 3.0,
      cached: 0.3,
      output: 15.0,
      tier: 'Flagship' as const,
      isFlagship: true,
      context: 200000,
    },
    {
      id: 'claude-3-5-sonnet',
      name: 'Claude 3.5 Sonnet',
      creator: 'anthropic',
      creatorName: 'Anthropic (Claude)',
      input: 3.0,
      cached: 0.3,
      output: 15.0,
      tier: 'Flagship' as const,
      isFlagship: false,
      context: 200000,
    },
    {
      id: 'deepseek-v3',
      name: 'DeepSeek V3',
      creator: 'deepseek',
      creatorName: 'DeepSeek',
      input: 0.14,
      cached: 0.014,
      output: 0.28,
      tier: 'Budget' as const,
      isFlagship: true,
      context: 128000,
    },
    {
      id: 'deepseek-r1',
      name: 'DeepSeek R1',
      creator: 'deepseek',
      creatorName: 'DeepSeek',
      input: 0.55,
      cached: 0.14,
      output: 2.19,
      tier: 'Reasoning' as const,
      isFlagship: true,
      context: 128000,
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      creator: 'openai',
      creatorName: 'OpenAI (GPT)',
      input: 2.5,
      cached: 1.25,
      output: 10.0,
      tier: 'Flagship' as const,
      isFlagship: true,
      context: 128000,
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o mini',
      creator: 'openai',
      creatorName: 'OpenAI (GPT)',
      input: 0.15,
      cached: 0.075,
      output: 0.6,
      tier: 'Budget' as const,
      isFlagship: false,
      context: 128000,
    },
    {
      id: 'o1',
      name: 'OpenAI o1',
      creator: 'openai',
      creatorName: 'OpenAI (GPT)',
      input: 15.0,
      cached: 7.5,
      output: 60.0,
      tier: 'Reasoning' as const,
      isFlagship: true,
      context: 200000,
    },
    {
      id: 'o3-mini',
      name: 'OpenAI o3-mini',
      creator: 'openai',
      creatorName: 'OpenAI (GPT)',
      input: 1.1,
      cached: 0.55,
      output: 4.4,
      tier: 'Reasoning' as const,
      isFlagship: false,
      context: 200000,
    },
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      creator: 'google',
      creatorName: 'Google (Gemini)',
      input: 0.1,
      cached: 0.025,
      output: 0.4,
      tier: 'Budget' as const,
      isFlagship: true,
      context: 1048576,
    },
    {
      id: 'grok-3',
      name: 'Grok 3',
      creator: 'xai',
      creatorName: 'xAI (Grok)',
      input: 3.0,
      cached: 1.5,
      output: 15.0,
      tier: 'Reasoning' as const,
      isFlagship: true,
      context: 128000,
    },
    {
      id: 'meta-llama-3.3-70b-instruct',
      name: 'Llama 3.3 70B Instruct',
      creator: 'meta',
      creatorName: 'Meta',
      input: 0.13,
      cached: 0.065,
      output: 0.4,
      tier: 'Mid' as const,
      isFlagship: true,
      context: 128000,
    },
    {
      id: 'qwen-2.5-72b-instruct',
      name: 'Qwen 2.5 72B Instruct',
      creator: 'alibaba',
      creatorName: 'Alibaba (Qwen)',
      input: 0.35,
      cached: 0.175,
      output: 0.4,
      tier: 'Mid' as const,
      isFlagship: true,
      context: 128000,
    },
  ];

  for (const f of flagships) {
    const existing = modelMap.get(f.id);
    if (existing) {
      existing.officialPricing.inputPerM = f.input;
      existing.officialPricing.cachedInputPerM = f.cached;
      existing.officialPricing.outputPerM = f.output;
      existing.tier = f.tier;
      existing.isFlagship = f.isFlagship;
      existing.contextWindow = f.context;
      existing.status = 'active';
    }
  }

  const finalModels = Array.from(modelMap.values()).sort((a, b) => {
    // Sort flagships first, then by input price
    if (a.isFlagship && !b.isFlagship) return -1;
    if (!a.isFlagship && b.isFlagship) return 1;
    return a.officialPricing.inputPerM - b.officialPricing.inputPerM;
  });

  writeFileSync(dataPath, JSON.stringify(finalModels, null, 2), 'utf-8');
  console.log(`\n🎉 Total models in database: ${finalModels.length}`);
}

updateLatestModels();
