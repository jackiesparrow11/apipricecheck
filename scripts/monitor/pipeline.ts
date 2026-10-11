#!/usr/bin/env bun
/**
 * scripts/monitor/pipeline.ts
 *
 * Automated Price Monitoring & Staging Gate for apipricecheck.com
 *
 * Usage:
 *   bun run monitor            ➔ Runs in TEST / DRY-RUN mode (does NOT touch production)
 *   bun run monitor --apply    ➔ Promotes staging to production models.json
 */

import { copyFileSync } from 'fs';
import { resolve } from 'path';
import { fetchAllUpstreams } from './fetcher';
import { analyzeAndGenerateStaging } from './diff-engine';

async function main() {
  const args = process.argv.slice(2);
  const isApply = args.includes('--apply');

  console.log('===============================================================');
  console.log('🛡️  API Price Monitor & Staging Pipeline');
  console.log(isApply ? '⚠️  MODE: PROD PROMOTION (--apply)' : '🧪 MODE: STAGING / DRY-RUN (Read-Only Test)');
  console.log('===============================================================\n');

  console.log('📡 Step 1: Polling upstream price feeds (models.dev + OpenRouter)...');
  const { results, modelsDevData, openRouterData } = await fetchAllUpstreams();

  results.forEach((r) => {
    if (r.status === 'success') {
      console.log(`  ✅ ${r.name}: OK (${r.modelsFound} models discovered)`);
    } else {
      console.log(`  ❌ ${r.name}: FAILED (${r.error})`);
    }
  });

  console.log('\n🔍 Step 2: Analyzing diffs against current production database...');
  const report = analyzeAndGenerateStaging(results, modelsDevData, openRouterData);

  console.log('📊 Change Summary:');
  console.log(`  • Active Production Models:       ${report.summary.totalProductionModels}`);
  console.log(`  • Proposed Staging Models:        ${report.summary.totalStagingModels}`);
  console.log(`  • New Models Detected:            ${report.summary.newModelsDetected}`);
  console.log(`  • Official Price Drops:           ${report.summary.priceDrops}`);
  console.log(`  • Official Price Increases:       ${report.summary.priceHikes}`);
  console.log(`  • Host / Relay Offer Changes:     ${report.summary.hostOfferUpdates}`);
  console.log(`  • Anomalies Flagged:              ${report.summary.criticalAnomalies}`);

  if (report.anomalies.length > 0) {
    console.log('\n⚠️  Critical Anomalies Detected:');
    report.anomalies.forEach((a) => {
      console.log(`  - [${a.modelName}] ${a.field}: ${a.oldValue} ➔ ${a.newValue} (${a.reason})`);
    });
  }

  console.log(`\n📁 Staging Artifacts Generated:`);
  console.log(`  • Staging Database:  ${report.stagingPath}`);
  console.log(`  • Audit Report:      ${report.reportPath}`);

  if (isApply) {
    if (report.anomalies.length > 0 && !args.includes('--force')) {
      console.error('\n❌ CANNOT APPLY: Anomalies detected. Review the report or pass --force to bypass.');
      process.exit(1);
    }

    const prodPath = resolve(__dirname, '../../src/data/models.json');
    copyFileSync(report.stagingPath, prodPath);
    console.log('\n🚀 PROMOTED: Staging has been successfully merged into production models.json!');
    console.log('   Run "bun run verify && bun run build" to deploy changes.\n');
  } else {
    console.log('\n🔒 PRODUCTION STATUS: UNTOUCHED');
    console.log('   No production files were modified. Staging data was verified in isolation.');
    console.log('   To promote staging to production, run: bun run monitor --apply\n');
  }
}

main().catch((err) => {
  console.error('Fatal Pipeline Error:', err);
  process.exit(1);
});
