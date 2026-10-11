export interface ProviderDefinition {
  id: string;
  name: string;
  type: 'creator' | 'host' | 'aggregator';
  typeLabel: 'Model Creator (Lab)' | 'Cloud Host' | 'API Aggregator / Relay';
  tagline: string;
  website: string;
  isMainstreamNav?: boolean; // For navigation dropdown
  navLabel?: string;
  logoBadge: string;
}

export const providersList: ProviderDefinition[] = [
  // --- Model Creators (Labs) ---
  {
    id: 'openai',
    name: 'OpenAI (GPT)',
    type: 'creator',
    typeLabel: 'Model Creator (Lab)',
    tagline: 'Pioneers of GPT-4o, o1, and o3 reasoning architectures',
    website: 'https://openai.com',
    isMainstreamNav: true,
    navLabel: 'OpenAI (GPT)',
    logoBadge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    type: 'creator',
    typeLabel: 'Model Creator (Lab)',
    tagline: 'Industry standard for software engineering and extended thinking',
    website: 'https://anthropic.com',
    isMainstreamNav: true,
    navLabel: 'Anthropic (Claude)',
    logoBadge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    id: 'google',
    name: 'Google (Gemini)',
    type: 'creator',
    typeLabel: 'Model Creator (Lab)',
    tagline: '2 Million context window and sub-second multimodal inference',
    website: 'https://ai.google.dev',
    isMainstreamNav: true,
    navLabel: 'Google (Gemini)',
    logoBadge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    type: 'creator',
    typeLabel: 'Model Creator (Lab)',
    tagline: 'Uncensored intelligence trained on Colossus 100k-H100 cluster',
    website: 'https://x.ai',
    isMainstreamNav: true,
    navLabel: 'xAI (Grok)',
    logoBadge: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    type: 'creator',
    typeLabel: 'Model Creator (Lab)',
    tagline: 'Open-weights efficiency pioneers with DeepSeek V3 and R1',
    website: 'https://deepseek.com',
    isMainstreamNav: true,
    navLabel: 'DeepSeek',
    logoBadge: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  },
  {
    id: 'zhipu',
    name: 'Zhipu AI (GLM / Z.ai)',
    type: 'creator',
    typeLabel: 'Model Creator (Lab)',
    tagline: 'Leading bilingual foundation models with CodeGeeX and GLM-4',
    website: 'https://z.ai',
    isMainstreamNav: true,
    navLabel: 'Zhipu (GLM)',
    logoBadge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  {
    id: 'moonshot',
    name: 'Moonshot AI (Kimi)',
    type: 'creator',
    typeLabel: 'Model Creator (Lab)',
    tagline: '2 Million token lossless context retrieval and mathematical reasoning',
    website: 'https://kimi.ai',
    isMainstreamNav: true,
    navLabel: 'Moonshot (Kimi)',
    logoBadge: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  },
  {
    id: 'alibaba',
    name: 'Alibaba (Qwen)',
    type: 'creator',
    typeLabel: 'Model Creator (Lab)',
    tagline: 'State-of-the-art open models: Qwen 2.5 72B & Qwen 2.5 Coder',
    website: 'https://alibabacloud.com',
    isMainstreamNav: true,
    navLabel: 'Alibaba (Qwen)',
    logoBadge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  },
  {
    id: 'meta',
    name: 'Meta',
    type: 'creator',
    typeLabel: 'Model Creator (Lab)',
    tagline: 'Open weights powerhouse behind the Llama 3.3 model family',
    website: 'https://llama.meta.com',
    isMainstreamNav: false,
    logoBadge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    type: 'creator',
    typeLabel: 'Model Creator (Lab)',
    tagline: 'High-efficiency European foundation models and Codestral',
    website: 'https://mistral.ai',
    isMainstreamNav: false,
    logoBadge: 'bg-amber-600/10 text-amber-700 dark:text-amber-300',
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    type: 'creator',
    typeLabel: 'Model Creator (Lab)',
    tagline: '4 Million token context multimodal models with lightning speed',
    website: 'https://minimaxi.com',
    isMainstreamNav: false,
    logoBadge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  },
  {
    id: 'cohere',
    name: 'Cohere',
    type: 'creator',
    typeLabel: 'Model Creator (Lab)',
    tagline: 'Enterprise-grade multilingual RAG and Command R+ models',
    website: 'https://cohere.com',
    isMainstreamNav: false,
    logoBadge: 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-300',
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    type: 'creator',
    typeLabel: 'Model Creator (Lab)',
    tagline: 'Autonomous search grounding and Sonar reasoning APIs',
    website: 'https://perplexity.ai',
    isMainstreamNav: false,
    logoBadge: 'bg-teal-600/10 text-teal-700 dark:text-teal-300',
  },

  // --- Hosting Providers / Cloud Relays / API Aggregators ---
  {
    id: 'openrouter',
    name: 'OpenRouter',
    type: 'aggregator',
    typeLabel: 'API Aggregator / Relay',
    tagline: 'Unified API gateway and dynamic multi-provider token routing',
    website: 'https://openrouter.ai',
    logoBadge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  {
    id: 'aws-bedrock',
    name: 'AWS Bedrock',
    type: 'host',
    typeLabel: 'Cloud Host',
    tagline: 'Amazon fully managed serverless foundation model cloud',
    website: 'https://aws.amazon.com/bedrock',
    logoBadge: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  },
  {
    id: 'azure',
    name: 'Microsoft Azure AI',
    type: 'host',
    typeLabel: 'Cloud Host',
    tagline: 'Enterprise-grade hosting for OpenAI models with SLAs',
    website: 'https://azure.microsoft.com',
    logoBadge: 'bg-blue-600/10 text-blue-700 dark:text-blue-300',
  },
  {
    id: 'groq',
    name: 'Groq',
    type: 'host',
    typeLabel: 'Cloud Host',
    tagline: 'LPU Inference Engine delivering 500+ tokens/sec throughput',
    website: 'https://groq.com',
    logoBadge: 'bg-red-500/10 text-red-600 dark:text-red-400',
  },
  {
    id: 'together',
    name: 'Together AI',
    type: 'host',
    typeLabel: 'Cloud Host',
    tagline: 'High-speed cloud inference and dedicated GPU clusters',
    website: 'https://together.ai',
    logoBadge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  },
  {
    id: 'deepinfra',
    name: 'DeepInfra',
    type: 'host',
    typeLabel: 'Cloud Host',
    tagline: 'Low-cost serverless inference for open-source AI models',
    website: 'https://deepinfra.com',
    logoBadge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    type: 'host',
    typeLabel: 'Cloud Host',
    tagline: 'World fastest inference engine powered by Wafer-Scale Engine (WSE-3)',
    website: 'https://cerebras.ai',
    logoBadge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    id: 'novita',
    name: 'Novita AI',
    type: 'host',
    typeLabel: 'Cloud Host',
    tagline: 'Elastic serverless LLM APIs and GPU cluster instances',
    website: 'https://novita.ai',
    logoBadge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  {
    id: 'telnyx',
    name: 'Telnyx',
    type: 'host',
    typeLabel: 'Cloud Host',
    tagline: 'Global edge network inference with private fiber optic routing',
    website: 'https://telnyx.com',
    logoBadge: 'bg-green-600/10 text-green-700 dark:text-green-300',
  },
  {
    id: 'fireworks',
    name: 'Fireworks AI',
    type: 'host',
    typeLabel: 'Cloud Host',
    tagline: 'Production-ready low-latency inference with speculative decoding',
    website: 'https://fireworks.ai',
    logoBadge: 'bg-orange-600/10 text-orange-700 dark:text-orange-300',
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    type: 'host',
    typeLabel: 'Cloud Host',
    tagline: 'Standardized microservices for high-throughput enterprise AI inference',
    website: 'https://build.nvidia.com',
    logoBadge: 'bg-lime-600/10 text-lime-700 dark:text-lime-300',
  },
  {
    id: 'castform',
    name: 'Castform',
    type: 'aggregator',
    typeLabel: 'API Aggregator / Relay',
    tagline: 'Developer-optimized high-availability AI routing layer',
    website: 'https://castform.ai',
    logoBadge: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  },
  {
    id: 'deepcogito',
    name: 'Deep Cogito',
    type: 'host',
    typeLabel: 'Cloud Host',
    tagline: 'Decentralized high-throughput inference cloud',
    website: 'https://deepcogito.com',
    logoBadge: 'bg-cyan-600/10 text-cyan-700 dark:text-cyan-300',
  },
  {
    id: 'essential',
    name: 'Essential AI',
    type: 'host',
    typeLabel: 'Cloud Host',
    tagline: 'Enterprise autonomous model orchestration and hosting',
    website: 'https://essential.ai',
    logoBadge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  },
  {
    id: 'typesafe',
    name: 'Typesafe',
    type: 'aggregator',
    typeLabel: 'API Aggregator / Relay',
    tagline: 'Strict schema validation and type-safe AI proxy middleware',
    website: 'https://typesafe.ai',
    logoBadge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
];

export function getProviderById(id: string): ProviderDefinition | undefined {
  return providersList.find((p) => p.id === id);
}

export function getMainstreamProviders(): ProviderDefinition[] {
  return providersList.filter((p) => p.isMainstreamNav);
}

export function getCreators(): ProviderDefinition[] {
  return providersList.filter((p) => p.type === 'creator');
}

export function getHostsAndAggregators(): ProviderDefinition[] {
  return providersList.filter((p) => p.type === 'host' || p.type === 'aggregator');
}
