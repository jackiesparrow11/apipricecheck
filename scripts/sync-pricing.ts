/**
 * 每日数据同步脚本: scripts/sync-pricing.ts
 * 运行方式: bun run scripts/sync-pricing.ts
 * 作用: 拉取 OpenRouter 官方公开模型列表与最新算力定价，校准 models.json 中的分销报价
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

interface OpenRouterModel {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
}

async function syncPricing() {
  console.log('🔄 开始从 OpenRouter API 同步最新模型与聚合单价...');

  const dataPath = resolve(__dirname, '../src/data/models.json');
  const localModels = JSON.parse(readFileSync(dataPath, 'utf-8'));

  try {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    if (!res.ok) {
      throw new Error(`OpenRouter API 请求失败: ${res.status} ${res.statusText}`);
    }

    const json = (await res.json()) as { data: OpenRouterModel[] };
    const remoteModels = json.data;
    console.log(`✅ 成功获取 ${remoteModels.length} 个远端模型数据。`);

    let updatedCount = 0;
    const today = new Date().toISOString().split('T')[0];

    for (const model of localModels) {
      // 模糊或精准匹配 OpenRouter ID
      const remote = remoteModels.find(
        (r) =>
          r.id === model.id ||
          r.id.endsWith(`/${model.id}`) ||
          r.id.toLowerCase().includes(model.id.toLowerCase())
      );

      if (remote && remote.pricing) {
        // OpenRouter pricing 单位是 per 1 token，需乘以 1,000,000
        const promptPerM = Number((parseFloat(remote.pricing.prompt) * 1_000_000).toFixed(4));
        const completionPerM = Number((parseFloat(remote.pricing.completion) * 1_000_000).toFixed(4));

        if (promptPerM > 0 || completionPerM > 0) {
          // 查找是否已存在 openrouter offer
          const existingOffer = model.aggregatorOffers.find((o: any) => o.aggregator === 'openrouter');
          if (existingOffer) {
            existingOffer.inputPerM = promptPerM;
            existingOffer.outputPerM = completionPerM;
            existingOffer.status = 'active';
          } else {
            model.aggregatorOffers.push({
              aggregator: 'openrouter',
              name: 'OpenRouter',
              inputPerM: promptPerM,
              outputPerM: completionPerM,
              status: 'active',
              outboundUrl: `https://openrouter.ai/${remote.id}`,
            });
          }
          model.lastVerifiedAt = today;
          updatedCount++;
        }
      }
    }

    writeFileSync(dataPath, JSON.stringify(localModels, null, 2), 'utf-8');
    console.log(`🎉 同步完成！共更新 ${updatedCount} 个模型的聚合商最新价格。`);
  } catch (err) {
    console.warn('⚠️ 远端数据拉取受阻，保持现有本地数据核验状态:', err);
  }
}

syncPricing();
