export interface ModelPricing {
  inputPerM: number;
  cachedInputPerM: number;
  outputPerM: number;
}

export type HostType = 'cloud' | 'aggregator' | 'specialized-hardware' | 'first-party';

export interface HostingOffer {
  hostId: string;
  hostName: string;
  hostType: HostType; // e.g. 'aggregator' (OpenRouter, DeepInfra), 'cloud' (AWS Bedrock, Azure), 'specialized-hardware' (Groq, Cerebras)
  inputPerM: number;
  cachedInputPerM?: number;
  outputPerM: number;
  latencyMs?: number;
  tokensPerSec?: number;
  status: 'active' | 'preview' | 'limited';
  outboundUrl: string;
  notes?: string;
}

export interface ModelRecord {
  id: string;
  name: string;
  family: string;
  creator: string; // e.g. 'openai', 'anthropic', 'deepseek', 'google', 'meta', 'xai', 'mistral', 'alibaba', 'zhipu', 'moonshot', 'minimax', 'cohere'
  creatorName: string;
  provider: string; // primary direct provider slug
  providerName: string;
  contextWindow: number;
  maxOutputTokens?: number;
  description: string;
  tier: 'Budget' | 'Mid' | 'Flagship' | 'Reasoning';
  isFlagship?: boolean;
  isCheapestInTier?: boolean;
  officialPricing: ModelPricing;
  scheduledPricing?: {
    peakHoursUtc: string[];
    peakTier: ModelPricing;
    offPeakTier: ModelPricing;
  };
  hostingOffers: HostingOffer[];
  status: 'active' | 'preview' | 'deprecated';
  releasedAt: string;
  lastVerifiedAt: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  category: 'creator' | 'host' | 'aggregator';
  description: string;
  officialUrl: string;
  logo?: string;
  modelsCount: number;
  minInputPerM: number;
  maxContext: number;
}

// Subscription Pricing Types
export type SubscriptionTier = 'free' | 'plus' | 'pro' | 'team' | 'power' | 'enterprise';

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: SubscriptionTier;
  priceMonthly: number;
  priceYearly?: number;
  pricePerSeatMonthly?: number;
  minSeats?: number;
  currency: string;
  includedModels: string[];
  contextWindow: string;
  rateLimits: string;
  features: string[];
  apiCreditIncluded?: string;
  bestFor: string;
  status: 'active' | 'popular' | 'preview';
}

export interface SubscriptionService {
  id: string;
  name: string;
  company: string;
  tagline: string;
  description: string;
  officialUrl: string;
  badgeColor: string;
  plans: SubscriptionPlan[];
  pros: string[];
  cons: string[];
  subVsApiAdvice: string;
  faqs: { question: string; answer: string }[];
}
