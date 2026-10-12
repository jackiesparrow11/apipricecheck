#!/usr/bin/env bun
/**
 * scripts/verify-pricing-integrity.ts
 *
 * Automated verification script and impact analyzer for API Price Check (apipricecheck.com).
 * Validates data integrity across models.json, providers.ts, and subscriptions.ts.
 * Computes the affected pages and components when data changes.
 *
 * Usage:
 *   bun run verify
 *   bun run scripts/verify-pricing-integrity.ts [--inspect <model-id>] [--strict]
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { providersList } from '../src/data/providers';
import { getAllSubscriptions } from '../src/data/subscriptions';
import { getTopHomepageModels, MAINSTREAM_CREATORS } from '../src/data/models';
import type { ModelRecord, HostingOffer } from '../src/data/types';

interface VerificationResult {
  errors: string[];
  warnings: string[];
  stats: {
    totalModels: number;
    totalCreators: number;
    totalHostingOffers: number;
    totalSubscriptions: number;
    totalSubscriptionPlans: number;
    totalGeneratedRoutes: number;
  };
  topHomepageModels: ModelRecord[];
  impactMap: Record<string, string[]>;
}

function runVerification(targetModelId?: string, isStrict = false): VerificationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const modelsPath = resolve(__dirname, '../src/data/models.json');
  let models: ModelRecord[] = [];

  try {
    const raw = readFileSync(modelsPath, 'utf8');
    models = JSON.parse(raw);
  } catch (err: any) {
    errors.push(`Failed to parse models.json: ${err.message}`);
    return {
      errors,
      warnings,
      stats: {
        totalModels: 0,
        totalCreators: 0,
        totalHostingOffers: 0,
        totalSubscriptions: 0,
        totalSubscriptionPlans: 0,
        totalGeneratedRoutes: 0,
      },
      topHomepageModels: [],
      impactMap: {},
    };
  }

  const modelIdSet = new Set<string>();
  const modelNameMap = new Map<string, ModelRecord>();
  const creatorSlugs = new Set<string>();
  const hostIdSet = new Set<string>();
  let totalHostingOffers = 0;

  // 1. Validate models.json
  models.forEach((m, idx) => {
    // Unique ID
    if (!m.id || typeof m.id !== 'string') {
      errors.push(`Model at index ${idx} is missing a valid 'id' string.`);
    } else if (modelIdSet.has(m.id)) {
      errors.push(`Duplicate model id detected: '${m.id}'.`);
    } else {
      modelIdSet.add(m.id);
      modelNameMap.set(m.name.toLowerCase(), m);
    }

    // Name & Creator
    if (!m.name) errors.push(`Model '${m.id || idx}' is missing 'name'.`);
    if (!m.creator) {
      errors.push(`Model '${m.id || idx}' is missing 'creator' slug.`);
    } else {
      creatorSlugs.add(m.creator);
    }

    // Context window
    if (!m.contextWindow || m.contextWindow <= 0) {
      warnings.push(`Model '${m.id}' has missing or non-positive contextWindow: ${m.contextWindow}`);
    }

    // Pricing checks
    if (!m.officialPricing) {
      errors.push(`Model '${m.id}' is missing 'officialPricing' object.`);
    } else {
      const { inputPerM, outputPerM, cachedInputPerM } = m.officialPricing;
      if (typeof inputPerM !== 'number' || inputPerM < 0) {
        errors.push(`Model '${m.id}' has invalid inputPerM: ${inputPerM}`);
      }
      if (typeof outputPerM !== 'number' || outputPerM < 0) {
        errors.push(`Model '${m.id}' has invalid outputPerM: ${outputPerM}`);
      }
      if (cachedInputPerM !== undefined && cachedInputPerM !== null) {
        if (typeof cachedInputPerM !== 'number' || cachedInputPerM < 0) {
          errors.push(`Model '${m.id}' has invalid cachedInputPerM: ${cachedInputPerM}`);
        }
        if (cachedInputPerM > inputPerM) {
          warnings.push(`Model '${m.id}' cachedInputPerM ($${cachedInputPerM}) exceeds regular inputPerM ($${inputPerM}).`);
        }
      }
    }

    // Hosting offers checks
    if (m.hostingOffers && Array.isArray(m.hostingOffers)) {
      totalHostingOffers += m.hostingOffers.length;
      m.hostingOffers.forEach((h: HostingOffer, hIdx: number) => {
        if (!h.hostId) errors.push(`Model '${m.id}' hostingOffer[${hIdx}] is missing 'hostId'.`);
        else hostIdSet.add(h.hostId);

        if (!h.hostName) warnings.push(`Model '${m.id}' hostingOffer[${hIdx}] is missing 'hostName'.`);
        if (typeof h.inputPerM !== 'number' || h.inputPerM < 0) {
          errors.push(`Model '${m.id}' host '${h.hostId}' has invalid inputPerM: ${h.inputPerM}`);
        }
        if (typeof h.outputPerM !== 'number' || h.outputPerM < 0) {
          errors.push(`Model '${m.id}' host '${h.hostId}' has invalid outputPerM: ${h.outputPerM}`);
        }
        if (!h.outboundUrl || !h.outboundUrl.startsWith('http')) {
          warnings.push(`Model '${m.id}' host '${h.hostId}' has invalid outboundUrl: '${h.outboundUrl}'`);
        }
      });
    }
  });

  // 2. Validate providers.ts mapping
  const definedProviderIds = new Set(providersList.map((p) => p.id));
  creatorSlugs.forEach((slug) => {
    if (!definedProviderIds.has(slug)) {
      warnings.push(`Creator '${slug}' in models.json is not defined in src/data/providers.ts providersList.`);
    }
  });

  hostIdSet.forEach((hostId) => {
    if (!definedProviderIds.has(hostId)) {
      warnings.push(`Host '${hostId}' used in hostingOffers is not cataloged in src/data/providers.ts providersList.`);
    }
  });

  // 3. Validate subscriptions.ts
  const subscriptions = getAllSubscriptions();
  let totalSubscriptionPlans = 0;

  subscriptions.forEach((sub) => {
    if (!sub.id || !sub.name || !sub.company) {
      errors.push(`Subscription '${sub.id || 'unnamed'}' is missing required id, name, or company.`);
    }

    if (!sub.plans || sub.plans.length === 0) {
      errors.push(`Subscription '${sub.id}' has zero plans.`);
    } else {
      totalSubscriptionPlans += sub.plans.length;
      sub.plans.forEach((plan) => {
        if (!plan.id || !plan.name || plan.priceMonthly === undefined) {
          errors.push(`Subscription '${sub.id}' plan '${plan.id || 'unnamed'}' is missing id, name, or priceMonthly.`);
        }
        if (!plan.includedModels || plan.includedModels.length === 0) {
          warnings.push(`Subscription '${sub.id}' plan '${plan.id}' has empty includedModels array.`);
        }
      });
    }

    if (!sub.faqs || sub.faqs.length === 0) {
      warnings.push(`Subscription '${sub.id}' has empty FAQ section (suboptimal for SEO FAQPage schema).`);
    }
  });

  // 4. Calculate Generated Routes & Impact Map
  const staticRoutes = [
    '/',
    '/subscriptions/',
    '/cheapest-llm-api/',
    '/calculators/token-cost/',
    '/api/pricing.json',
    '/sitemap.xml',
    '/robots.txt',
  ];

  const providerRoutes = Array.from(creatorSlugs).map((slug) => `/pricing/${slug}/`);
  const subscriptionRoutes = subscriptions.map((s) => `/subscriptions/${s.id}/`);
  const totalGeneratedRoutes = staticRoutes.length + providerRoutes.length + subscriptionRoutes.length;

  // Build Impact Map per Model
  const impactMap: Record<string, string[]> = {};

  models.forEach((m) => {
    const affected: string[] = [
      '/',
      `/pricing/${m.creator}/`,
      '/cheapest-llm-api/',
      '/calculators/token-cost/',
      '/api/pricing.json',
      '/sitemap.xml',
    ];

    // Check if bundled in any subscription plan
    subscriptions.forEach((sub) => {
      const isBundled = sub.plans.some((p) =>
        p.includedModels.some((inc) =>
          inc.toLowerCase().includes(m.name.toLowerCase()) ||
          m.name.toLowerCase().includes(inc.toLowerCase()) ||
          m.id.toLowerCase().includes(inc.toLowerCase())
        )
      );
      if (isBundled) {
        affected.push(`/subscriptions/${sub.id}/`);
      }
    });

    impactMap[m.id] = affected;
  });

  // 6. Validate Dynamic Top 20 Flagship Models Judgment Mechanism
  const topHomepageModels = getTopHomepageModels(20, models);
  if (topHomepageModels.length < 15) {
    errors.push(`Dynamic top models selector returned insufficient models (${topHomepageModels.length} < 15).`);
  }
  for (const lab of MAINSTREAM_CREATORS) {
    const hasLab = topHomepageModels.some((m) => m.creator === lab || m.provider === lab);
    if (!hasLab) {
      warnings.push(`Dynamic top models selector missing representation for lab: '${lab}'.`);
    }
  }

  return {
    errors,
    warnings,
    stats: {
      totalModels: models.length,
      totalCreators: creatorSlugs.size,
      totalHostingOffers,
      totalSubscriptions: subscriptions.length,
      totalSubscriptionPlans,
      totalGeneratedRoutes,
    },
    topHomepageModels,
    impactMap,
  };
}

// CLI Execution Handler
const args = process.argv.slice(2);
const inspectIndex = args.indexOf('--inspect');
const targetModelId = inspectIndex !== -1 ? args[inspectIndex + 1] : undefined;
const isStrict = args.includes('--strict');

console.log('===============================================================');
console.log('🔍 API Price Check — Data Integrity & Impact Verification SOP');
console.log('===============================================================\n');

const result = runVerification(targetModelId, isStrict);

console.log('📊 System Statistics:');
console.log(`  • Canonical & Scraped Models:    ${result.stats.totalModels}`);
console.log(`  • Model Creators / Labs:         ${result.stats.totalCreators}`);
console.log(`  • Hosting / Relay Offers:        ${result.stats.totalHostingOffers}`);
console.log(`  • Monitored Subscriptions:       ${result.stats.totalSubscriptions} services (${result.stats.totalSubscriptionPlans} plans)`);
console.log(`  • Total Static Generated Routes: ${result.stats.totalGeneratedRoutes} URLs\n`);

console.log('🏆 Real-Time Top 20 Flagship Models (Dynamic Judgment Algorithm):');
result.topHomepageModels.forEach((m, idx) => {
  console.log(
    `  ${(idx + 1).toString().padStart(2)}. [${m.creatorName}] ${m.name.padEnd(25)} | Rel: ${m.releasedAt} | Tier: ${m.tier.padEnd(10)} | In: $${m.officialPricing.inputPerM}/1M · Out: $${m.officialPricing.outputPerM}/1M`
  );
});
console.log();

if (targetModelId) {
  const affected = result.impactMap[targetModelId];
  console.log(`🎯 Impact Graph for Model: [${targetModelId}]`);
  if (!affected) {
    console.log(`  ❌ Model '${targetModelId}' not found in database!`);
  } else {
    console.log(`  Re-generated & affected pages (${affected.length}):`);
    affected.forEach((url) => console.log(`   ➔ ${url}`));
  }
  console.log();
}

// Print Warnings
if (result.warnings.length > 0) {
  console.log(`⚠️  Data Warnings (${result.warnings.length}):`);
  result.warnings.slice(0, 15).forEach((w) => console.log(`  - ${w}`));
  if (result.warnings.length > 15) {
    console.log(`  ... and ${result.warnings.length - 15} more warnings.`);
  }
  console.log();
}

// Print Errors
if (result.errors.length > 0) {
  console.error(`❌ Data Integrity Errors (${result.errors.length}):`);
  result.errors.forEach((e) => console.error(`  - ${e}`));
  console.log();
  process.exit(1);
}

if (isStrict && result.warnings.length > 0) {
  console.error('❌ Failed due to strict mode with active warnings.');
  process.exit(1);
}

console.log('✅ PASS: All model schemas, pricing rules, and cross-references verified cleanly!');
console.log('🚀 Ready for production build: bun run build\n');
