import modelsData from './models.json';
import type { ModelRecord, ProviderInfo } from './types';
import { providersList } from './providers';

export const models: ModelRecord[] = modelsData as ModelRecord[];

export function getAllModels(): ModelRecord[] {
  return models;
}

export function getModelById(id: string): ModelRecord | undefined {
  return models.find((m) => m.id === id);
}

export function getModelsByProvider(provider: string): ModelRecord[] {
  return models.filter(
    (m) =>
      m.provider.toLowerCase() === provider.toLowerCase() ||
      m.creator.toLowerCase() === provider.toLowerCase()
  );
}

export function getModelsByCreator(creator: string): ModelRecord[] {
  return models.filter((m) => m.creator.toLowerCase() === creator.toLowerCase());
}

export function getModelsByHost(hostId: string): ModelRecord[] {
  return models.filter((m) => m.hostingOffers?.some((h) => h.hostId.toLowerCase() === hostId.toLowerCase()));
}

export function getCheapestModels(limit = 10): ModelRecord[] {
  return [...models].sort((a, b) => a.officialPricing.inputPerM - b.officialPricing.inputPerM).slice(0, limit);
}

/**
 * Mainstream AI Lab Creator slugs in priority order.
 * Ensures balanced representation of all leading foundation model creators.
 */
export const MAINSTREAM_CREATORS = [
  'openai',
  'anthropic',
  'google',
  'deepseek',
  'xai',
  'alibaba',
  'meta',
  'mistral',
  'zhipu',
  'moonshot',
  'minimax',
  'cohere',
  'perplexity',
] as const;

export const FRONTIER_TIER1_LABS = [
  'openai',
  'anthropic',
  'google',
  'deepseek',
  'xai',
  'alibaba',
  'meta',
] as const;

/**
 * Data-driven score calculation for model freshness, flagship stature, and ecosystem adoption.
 * Evaluates candidate models strictly from live dataset fields without hardcoded IDs.
 */
export function calculateModelFreshnessScore(m: ModelRecord): number {
  if (m.status === 'deprecated') return -10000;

  // Filter out non-generative / embedding / reranking models for chat/completion tables
  const nameLower = m.name.toLowerCase();
  if (nameLower.includes('embed') || nameLower.includes('rerank')) return -500;

  let score = 0;

  // 1. Recency / Release Timestamp (Highest weight: newer architectural generations rank first)
  if (m.releasedAt) {
    const time = new Date(m.releasedAt).getTime();
    if (!isNaN(time)) {
      // Days elapsed since 2024-01-01 base: 2026 releases get ~500+ points
      const daysSince2024 = (time - new Date('2024-01-01').getTime()) / (1000 * 3600 * 24);
      score += daysSince2024 * 0.5;
    }
  }

  // 2. Generative completion model bonus (must produce completion tokens)
  if (m.officialPricing.outputPerM > 0) score += 25;

  // 3. Flagship stature & Architectural Tier
  if (m.isFlagship) score += 40;
  if (m.tier === 'Flagship') score += 30;
  else if (m.tier === 'Reasoning') score += 28;
  else if (m.tier === 'Mid') score += 15;
  else if (m.tier === 'Budget') score += 10;

  // 4. Ecosystem Adoption & Hosting Availability
  if (m.status === 'active') score += 15;
  const hostCount = m.hostingOffers ? m.hostingOffers.length : 0;
  score += Math.min(hostCount, 4) * 5; // Up to 20 pts for multi-host models

  // 5. Frontier Context Window Capability
  if (m.contextWindow >= 1000000) score += 10;
  else if (m.contextWindow >= 128000) score += 5;

  return score;
}

/**
 * Dynamic Top Models Selector (Homepage Top 20 Flagships).
 *
 * Judgment Mechanism:
 * 1. Automatically queries live dataset (models.json / staging).
 * 2. Stage 1: Discovers and guarantees the #1 highest-scoring latest model for EVERY mainstream AI creator lab.
 * 3. Stage 2: Discovers the #2 runner-up model for tier-1 frontier labs (OpenAI, Anthropic, Google, DeepSeek, xAI, Alibaba, Meta).
 * 4. Stage 3: Fills any remaining slots with highest-scoring models globally.
 */
export function getTopHomepageModels(limit = 20, dataset: ModelRecord[] = models): ModelRecord[] {
  const selected: ModelRecord[] = [];
  const selectedIds = new Set<string>();

  const addModel = (m: ModelRecord | undefined): boolean => {
    if (m && !selectedIds.has(m.id) && selected.length < limit) {
      selected.push(m);
      selectedIds.add(m.id);
      return true;
    }
    return false;
  };

  // Stage 1: Round 1 - Pick #1 latest flagship for each mainstream creator
  for (const creatorId of MAINSTREAM_CREATORS) {
    const creatorModels = dataset
      .filter((m) => (m.creator === creatorId || m.provider === creatorId) && m.status !== 'deprecated')
      .sort((a, b) => calculateModelFreshnessScore(b) - calculateModelFreshnessScore(a));

    if (creatorModels.length > 0) {
      addModel(creatorModels[0]);
    }
  }

  // Stage 2: Round 2 - Pick #2 runner-up model for tier-1 frontier labs
  for (const creatorId of FRONTIER_TIER1_LABS) {
    if (selected.length >= limit) break;
    const runnerUps = dataset
      .filter(
        (m) =>
          (m.creator === creatorId || m.provider === creatorId) &&
          m.status !== 'deprecated' &&
          !selectedIds.has(m.id)
      )
      .sort((a, b) => calculateModelFreshnessScore(b) - calculateModelFreshnessScore(a));

    if (runnerUps.length > 0) {
      addModel(runnerUps[0]);
    }
  }

  // Stage 3: Global fallback if quota remains
  if (selected.length < limit) {
    const remaining = dataset
      .filter((m) => !selectedIds.has(m.id) && m.status !== 'deprecated')
      .sort((a, b) => calculateModelFreshnessScore(b) - calculateModelFreshnessScore(a));

    for (const m of remaining) {
      if (selected.length >= limit) break;
      addModel(m);
    }
  }

  return selected;
}

export function getProvidersList(): ProviderInfo[] {
  const map = new Map<string, { models: ModelRecord[]; name: string; creatorSlug: string }>();

  for (const model of models) {
    const slug = model.creator || model.provider;
    const name = model.creatorName || model.providerName;
    if (!map.has(slug)) {
      map.set(slug, { models: [], name, creatorSlug: slug });
    }
    map.get(slug)!.models.push(model);
  }

  const providers: ProviderInfo[] = [];

  map.forEach((value, key) => {
    const minInput = Math.min(...value.models.map((m) => m.officialPricing.inputPerM));
    const maxContext = Math.max(...value.models.map((m) => m.contextWindow));
    const provDef = providersList.find((p) => p.id === key);

    providers.push({
      id: key,
      name: provDef?.name || value.name,
      category: 'creator',
      description: provDef?.tagline || `Official and aggregated API pricing for ${value.name} models.`,
      officialUrl: provDef?.website || `https://${key}.com`,
      logo: `/logos/${key}.svg`,
      modelsCount: value.models.length,
      minInputPerM: minInput,
      maxContext: maxContext,
    });
  });

  return providers.sort((a, b) => b.modelsCount - a.modelsCount);
}

/**
 * Calculate token cost for a model under given prompt/completion/cache conditions
 */
export function calculateCost(
  model: ModelRecord,
  inputTokens: number,
  outputTokens: number,
  cacheHitRatio = 0
): {
  officialCost: number;
  aggregatorCost: number;
  savings: number;
  savingsPercent: number;
  bestHostName?: string;
} {
  const effectiveCache = Math.max(0, Math.min(1, cacheHitRatio));
  const cachedInput = inputTokens * effectiveCache;
  const regularInput = inputTokens * (1 - effectiveCache);

  // Official direct cost calculation (per 1M tokens)
  const officialInputCost =
    (regularInput * model.officialPricing.inputPerM +
      cachedInput * (model.officialPricing.cachedInputPerM || model.officialPricing.inputPerM)) /
    1_000_000;
  const officialOutputCost = (outputTokens * model.officialPricing.outputPerM) / 1_000_000;
  const officialCost = officialInputCost + officialOutputCost;

  // Best hosting / aggregator cost calculation
  let bestAggregatorInput = model.officialPricing.inputPerM;
  let bestAggregatorOutput = model.officialPricing.outputPerM;
  let bestHostName: string | undefined = undefined;

  const offers = model.hostingOffers || [];
  if (offers.length > 0) {
    for (const offer of offers) {
      if (offer.status === 'active') {
        const totalOfferEstimate =
          (regularInput * offer.inputPerM + outputTokens * offer.outputPerM) / 1_000_000;
        const currentBestEstimate =
          (regularInput * bestAggregatorInput + outputTokens * bestAggregatorOutput) / 1_000_000;

        if (totalOfferEstimate < currentBestEstimate) {
          bestAggregatorInput = offer.inputPerM;
          bestAggregatorOutput = offer.outputPerM;
          bestHostName = offer.hostName;
        }
      }
    }
  }

  const aggregatorInputCost =
    (regularInput * bestAggregatorInput +
      cachedInput * (model.officialPricing.cachedInputPerM || bestAggregatorInput * 0.5)) /
    1_000_000;
  const aggregatorOutputCost = (outputTokens * bestAggregatorOutput) / 1_000_000;
  const aggregatorCost = aggregatorInputCost + aggregatorOutputCost;

  const savings = Math.max(0, officialCost - aggregatorCost);
  const savingsPercent = officialCost > 0 ? (savings / officialCost) * 100 : 0;

  return {
    officialCost,
    aggregatorCost,
    savings,
    savingsPercent,
    bestHostName,
  };
}
