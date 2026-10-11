import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import type { ModelRecord, HostingOffer } from '../../src/data/types';
import type { DiffEntry, MonitoringReport, ChangeSeverity, ChangeCategory } from './types';
import type { UpstreamFetchResult } from './fetcher';

const ANOMALY_PRICE_DROP_THRESHOLD = -80; // > 80% price drop triggers anomaly check
const ANOMALY_PRICE_HIKE_THRESHOLD = 200; // > 200% price hike triggers anomaly check

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

export function analyzeAndGenerateStaging(
  upstreamResults: UpstreamFetchResult[],
  modelsDevData: any,
  openRouterData: any
): MonitoringReport {
  const prodPath = resolve(__dirname, '../../src/data/models.json');
  const stagingPath = resolve(__dirname, '../../src/data/models.staging.json');
  const today = new Date().toISOString().split('T')[0];
  const reportPath = resolve(__dirname, `../../reports/pricing-diff-${today}.md`);

  const prodModels: ModelRecord[] = JSON.parse(readFileSync(prodPath, 'utf-8'));
  const prodMap = new Map<string, ModelRecord>();
  prodModels.forEach((m) => prodMap.set(m.id, JSON.parse(JSON.stringify(m))));

  const stagingMap = new Map<string, ModelRecord>();
  prodModels.forEach((m) => stagingMap.set(m.id, JSON.parse(JSON.stringify(m))));

  const diffs: DiffEntry[] = [];
  const anomalies: DiffEntry[] = [];

  // 1. Process models.dev updates
  if (modelsDevData) {
    for (const [provKey, provData] of Object.entries(modelsDevData) as any) {
      const creator = CREATOR_MAP[provKey.toLowerCase()];
      if (!creator || !provData?.models) continue;

      for (const [mKey, mData] of Object.entries(provData.models) as any) {
        if (!mData.cost || mData.cost.input === undefined) continue;

        const rawId = mKey.toLowerCase().replace(/[^a-z0-9_.-]/g, '-');
        const cleanId = rawId.includes('/') ? rawId.split('/').pop()! : rawId;
        const newInput = Number(mData.cost.input.toFixed(4));
        const newOutput = Number((mData.cost.output ?? newInput * 2).toFixed(4));
        const newCache = mData.cost.cache_read !== undefined ? Number(mData.cost.cache_read.toFixed(4)) : newInput * 0.5;
        const contextWin = mData.limit?.context || 128000;

        if (stagingMap.has(cleanId)) {
          const target = stagingMap.get(cleanId)!;
          const oldInput = target.officialPricing.inputPerM;

          // Check if price changed
          if (Math.abs(newInput - oldInput) > 0.0001 && target.status !== 'active') {
            const pct = oldInput > 0 ? ((newInput - oldInput) / oldInput) * 100 : 100;
            const category: ChangeCategory = pct < 0 ? 'PRICE_DROP' : 'PRICE_HIKE';
            let severity: ChangeSeverity = 'info';
            let isAnomaly = false;

            if (pct <= ANOMALY_PRICE_DROP_THRESHOLD || pct >= ANOMALY_PRICE_HIKE_THRESHOLD) {
              severity = 'warning';
              isAnomaly = true;
            }

            const entry: DiffEntry = {
              modelId: cleanId,
              modelName: target.name,
              creator: target.creator,
              category,
              field: 'officialPricing.inputPerM',
              oldValue: oldInput,
              newValue: newInput,
              percentageChange: Number(pct.toFixed(1)),
              severity,
              reason: isAnomaly ? `Dramatic price shift (${pct.toFixed(1)}%) requires human review` : undefined,
            };

            diffs.push(entry);
            if (isAnomaly) anomalies.push(entry);

            // Apply to staging
            target.officialPricing.inputPerM = newInput;
            target.officialPricing.outputPerM = newOutput;
            target.officialPricing.cachedInputPerM = newCache;
            target.lastVerifiedAt = today;
          }
        } else {
          // New Model Candidate
          const entry: DiffEntry = {
            modelId: cleanId,
            modelName: mData.name || cleanId,
            creator: creator.id,
            category: 'NEW_MODEL',
            field: 'entire_model',
            oldValue: null,
            newValue: { inputPerM: newInput, outputPerM: newOutput },
            severity: 'notice',
          };
          diffs.push(entry);

          // Add candidate to staging
          stagingMap.set(cleanId, {
            id: cleanId,
            name: mData.name || cleanId,
            family: creator.name,
            creator: creator.id,
            creatorName: creator.name,
            provider: creator.id,
            providerName: `${creator.name} API`,
            contextWindow: contextWin,
            maxOutputTokens: mData.limit?.output || 8192,
            description: mData.description || `State-of-the-art ${cleanId} model by ${creator.name}.`,
            tier: newInput <= 0.2 ? 'Budget' : newInput >= 2.0 ? 'Flagship' : 'Mid',
            officialPricing: {
              inputPerM: newInput,
              cachedInputPerM: newCache,
              outputPerM: newOutput,
            },
            hostingOffers: [],
            status: 'preview',
            releasedAt: mData.release_date || today,
            lastVerifiedAt: today,
          });
        }
      }
    }
  }

  // 2. Process OpenRouter hosting offers
  let hostOfferUpdates = 0;
  if (openRouterData && Array.isArray(openRouterData)) {
    for (const [mId, model] of stagingMap.entries()) {
      const remote = openRouterData.find(
        (r) =>
          r.id.toLowerCase() === mId ||
          r.id.toLowerCase().endsWith(`/${mId}`) ||
          r.id.toLowerCase().includes(mId)
      );

      if (remote && remote.pricing) {
        const promptPerM = Number((parseFloat(remote.pricing.prompt) * 1_000_000).toFixed(4));
        const completionPerM = Number((parseFloat(remote.pricing.completion) * 1_000_000).toFixed(4));

        if (promptPerM > 0 || completionPerM > 0) {
          if (!model.hostingOffers) model.hostingOffers = [];

          const existingOffer = model.hostingOffers.find((h) => h.hostId === 'openrouter');
          if (existingOffer) {
            if (Math.abs(existingOffer.inputPerM - promptPerM) > 0.001) {
              diffs.push({
                modelId: mId,
                modelName: model.name,
                creator: model.creator,
                category: 'HOST_OFFER_UPDATE',
                field: 'hostingOffers.openrouter.inputPerM',
                oldValue: existingOffer.inputPerM,
                newValue: promptPerM,
                severity: 'info',
              });
              existingOffer.inputPerM = promptPerM;
              existingOffer.outputPerM = completionPerM;
              hostOfferUpdates++;
            }
          } else {
            model.hostingOffers.push({
              hostId: 'openrouter',
              hostName: 'OpenRouter',
              hostType: 'aggregator',
              inputPerM: promptPerM,
              outputPerM: completionPerM,
              status: 'active',
              outboundUrl: `https://openrouter.ai/${remote.id}`,
            });
            hostOfferUpdates++;
          }
        }
      }
    }
  }

  // 3. Save to Staging JSON (DO NOT OVERWRITE PRODUCTION!)
  const stagingModels = Array.from(stagingMap.values());
  writeFileSync(stagingPath, JSON.stringify(stagingModels, null, 2), 'utf-8');

  // 4. Generate Markdown Audit Report
  const priceDrops = diffs.filter((d) => d.category === 'PRICE_DROP').length;
  const priceHikes = diffs.filter((d) => d.category === 'PRICE_HIKE').length;
  const newModels = diffs.filter((d) => d.category === 'NEW_MODEL').length;

  const reportMd = `# Price Monitoring & Staging Audit Report (${today})

> **Mode**: Staging / Dry-Run (Production \`models.json\` remains unchanged)  
> **Staging File**: \`src/data/models.staging.json\`  
> **Generated**: ${new Date().toISOString()}

---

## 1. Upstream Health Check

| Upstream Provider | Endpoint | Status | Models Found |
| :--- | :--- | :--- | :--- |
${upstreamResults
  .map(
    (u) =>
      `| **${u.name}** | \`${u.url}\` | ${u.status === 'success' ? '✅ Online' : '❌ Offline (' + u.error + ')'} | ${u.modelsFound} |`
  )
  .join('\n')}

---

## 2. Executive Summary

- **Production Models**: ${prodModels.length}
- **Staging Models (Proposed)**: ${stagingModels.length}
- **New Models Detected**: ${newModels}
- **Price Drops Detected**: ${priceDrops}
- **Price Increases Detected**: ${priceHikes}
- **Hosting / Relay Offer Changes**: ${hostOfferUpdates}
- **Critical Anomalies Flagged**: ${anomalies.length}

---

## 3. Flagged Anomalies (${anomalies.length})

${
  anomalies.length === 0
    ? '✅ No pricing anomalies or extreme deviations detected. Safe for automated merge.'
    : anomalies
        .map(
          (a) =>
            `- ⚠️ **[${a.modelName} (\`${a.modelId}\`)]** ${a.field}: \`$${a.oldValue}\` ➔ \`$${a.newValue}\` (${a.percentageChange}%). Reason: ${a.reason}`
        )
        .join('\n')
}

---

## 4. Itemized Changes (${diffs.length})

| Model | Creator | Category | Field | Old Value | Proposed New Value | Severity |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${
  diffs.length === 0
    ? '| None | - | - | - | - | - | - |'
    : diffs
        .slice(0, 50)
        .map(
          (d) =>
            `| **${d.modelName}** | \`${d.creator}\` | \`${d.category}\` | \`${d.field}\` | ${JSON.stringify(d.oldValue)} | ${JSON.stringify(d.newValue)} | \`${d.severity}\` |`
        )
        .join('\n')
}
${diffs.length > 50 ? `\n*(Showing top 50 of ${diffs.length} total changes)*` : ''}

---

## 5. Promotion Instructions

To review and apply these changes to production:
\`\`\`bash
# 1. Inspect diffs in terminal
bun run monitor

# 2. Promote staging to production (modifies models.json)
bun run monitor --apply

# 3. Verify and build production
bun run verify && bun run build
\`\`\`
`;

  writeFileSync(reportPath, reportMd, 'utf-8');

  return {
    timestamp: new Date().toISOString(),
    date: today,
    upstreamsChecked: upstreamResults.map((u) => ({
      name: u.name,
      url: u.url,
      status: u.status,
      modelsFound: u.modelsFound,
    })),
    summary: {
      totalProductionModels: prodModels.length,
      totalStagingModels: stagingModels.length,
      newModelsDetected: newModels,
      priceDrops,
      priceHikes,
      hostOfferUpdates,
      criticalAnomalies: anomalies.length,
    },
    anomalies,
    diffs,
    stagingPath,
    reportPath,
    canSafelyPromote: anomalies.length === 0,
  };
}
