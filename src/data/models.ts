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

export function getTopHomepageModels(limit = 20): ModelRecord[] {
  const priorityIds = [
    'claude-3-7-sonnet',
    'claude-3-5-sonnet',
    'deepseek-r1',
    'deepseek-v3',
    'gpt-4o',
    'gpt-4o-mini',
    'o1',
    'o3-mini',
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'grok-3',
    'grok-2',
    'meta-llama-3.3-70b-instruct',
    'meta-llama-3.1-8b-instruct',
    'qwen-2.5-72b-instruct',
    'qwen-2.5-coder-32b-instruct',
    'glm-4-plus',
    'kimi-1.5',
    'minimax-01',
    'mistral-large-2411',
    'codestral-latest',
    'sonar-pro',
  ];

  const result: ModelRecord[] = [];
  const addedIds = new Set<string>();

  for (const id of priorityIds) {
    const found = models.find((m) => m.id === id);
    if (found && !addedIds.has(found.id)) {
      result.push(found);
      addedIds.add(found.id);
      if (result.length >= limit) return result;
    }
  }

  for (const m of models) {
    if (m.isFlagship && !addedIds.has(m.id)) {
      result.push(m);
      addedIds.add(m.id);
      if (result.length >= limit) break;
    }
  }

  return result;
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
