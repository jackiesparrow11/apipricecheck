export interface UpstreamFetchResult {
  name: string;
  url: string;
  status: 'success' | 'failed';
  modelsFound: number;
  data: any;
  error?: string;
}

export async function fetchAllUpstreams(timeoutMs = 15000): Promise<{
  results: UpstreamFetchResult[];
  modelsDevData: any;
  openRouterData: any;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const results: UpstreamFetchResult[] = [];
  let modelsDevData: any = null;
  let openRouterData: any = null;

  // 1. Fetch models.dev (New API standard preset)
  try {
    const res = await fetch('https://models.dev/api.json', { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    modelsDevData = await res.json();
    let count = 0;
    for (const p of Object.values(modelsDevData) as any[]) {
      if (p.models) count += Object.keys(p.models).length;
    }
    results.push({
      name: 'models.dev',
      url: 'https://models.dev/api.json',
      status: 'success',
      modelsFound: count,
      data: modelsDevData,
    });
  } catch (err: any) {
    results.push({
      name: 'models.dev',
      url: 'https://models.dev/api.json',
      status: 'failed',
      modelsFound: 0,
      data: null,
      error: err.message,
    });
  }

  // 2. Fetch OpenRouter API
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const json = await res.json();
    openRouterData = json.data || [];
    results.push({
      name: 'OpenRouter',
      url: 'https://openrouter.ai/api/v1/models',
      status: 'success',
      modelsFound: openRouterData.length,
      data: openRouterData,
    });
  } catch (err: any) {
    results.push({
      name: 'OpenRouter',
      url: 'https://openrouter.ai/api/v1/models',
      status: 'failed',
      modelsFound: 0,
      data: null,
      error: err.message,
    });
  }

  clearTimeout(timer);
  return { results, modelsDevData, openRouterData };
}
