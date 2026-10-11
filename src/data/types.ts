export interface ModelPricing {
  inputPerM: number;
  cachedInputPerM: number;
  outputPerM: number;
}

export interface AggregatorOffer {
  aggregator: string;
  name: string;
  inputPerM: number;
  outputPerM: number;
  cachedInputPerM?: number;
  status: 'active' | 'limited';
  outboundUrl: string;
  notes?: string;
}

export interface ModelRecord {
  id: string;
  name: string;
  family: string;
  provider: string;
  providerName: string;
  contextWindow: number;
  maxOutputTokens?: number;
  description: string;
  tier: 'Low' | 'Mid' | 'High';
  isFlagship?: boolean;
  isCheapestInTier?: boolean;
  officialPricing: ModelPricing;
  scheduledPricing?: {
    peakHoursUtc: string[];
    peakTier: ModelPricing;
    offPeakTier: ModelPricing;
  };
  aggregatorOffers: AggregatorOffer[];
  status: 'active' | 'deprecated';
  releasedAt: string;
  lastVerifiedAt: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  officialUrl: string;
  logo: string;
  modelsCount: number;
  minInputPerM: number;
  maxContext: number;
}
