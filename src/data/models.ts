import modelsData from './models.json';
import type { ModelRecord, ProviderInfo } from './types';

export const models: ModelRecord[] = modelsData as ModelRecord[];

export function getAllModels(): ModelRecord[] {
  return models;
}

export function getModelById(id: string): ModelRecord | undefined {
  return models.find((m) => m.id === id);
}

export function getModelsByProvider(provider: string): ModelRecord[] {
  return models.filter((m) => m.provider.toLowerCase() === provider.toLowerCase());
}

export function getCheapestModels(limit = 10): ModelRecord[] {
  return [...models].sort((a, b) => a.officialPricing.inputPerM - b.officialPricing.inputPerM).slice(0, limit);
}

export function getProvidersList(): ProviderInfo[] {
  const map = new Map<string, { models: ModelRecord[]; name: string }>();

  for (const model of models) {
    if (!map.has(model.provider)) {
      map.set(model.provider, { models: [], name: model.providerName });
    }
    map.get(model.provider)!.models.push(model);
  }

  const providers: ProviderInfo[] = [];

  map.forEach((value, key) => {
    const minInput = Math.min(...value.models.map((m) => m.officialPricing.inputPerM));
    const maxContext = Math.max(...value.models.map((m) => m.contextWindow));

    providers.push({
      id: key,
      name: value.name,
      description: `Official and aggregated API pricing for ${value.name} models.`,
      officialUrl: `https://${key}.com`,
      logo: `/logos/${key}.svg`,
      modelsCount: value.models.length,
      minInputPerM: minInput,
      maxContext: maxContext,
    });
  });

  return providers.sort((a, b) => b.modelsCount - a.modelsCount);
}

/**
 * 计算单个模型在给定输入/输出/缓存条件下的花费
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
} {
  const effectiveCache = Math.max(0, Math.min(1, cacheHitRatio));
  const cachedInput = inputTokens * effectiveCache;
  const regularInput = inputTokens * (1 - effectiveCache);

  // 官方花费计算 (基于 1M tokens)
  const officialInputCost =
    (regularInput * model.officialPricing.inputPerM +
      cachedInput * model.officialPricing.cachedInputPerM) /
    1_000_000;
  const officialOutputCost = (outputTokens * model.officialPricing.outputPerM) / 1_000_000;
  const officialCost = officialInputCost + officialOutputCost;

  // 聚合商花费计算 (寻找可用最低者)
  let bestAggregatorInput = model.officialPricing.inputPerM;
  let bestAggregatorOutput = model.officialPricing.outputPerM;

  if (model.aggregatorOffers && model.aggregatorOffers.length > 0) {
    for (const offer of model.aggregatorOffers) {
      if (offer.status === 'active') {
        if (offer.inputPerM < bestAggregatorInput) bestAggregatorInput = offer.inputPerM;
        if (offer.outputPerM < bestAggregatorOutput) bestAggregatorOutput = offer.outputPerM;
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
  };
}
