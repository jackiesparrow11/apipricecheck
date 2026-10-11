import { useState, useMemo } from 'preact/hooks';
import type { ModelRecord } from '../data/types';
import { calculateCost } from '../data/models';

interface Props {
  models: ModelRecord[];
  initialModelId?: string;
  embedded?: boolean;
}

export default function TokenCalculator({ models, initialModelId = 'gpt-4o', embedded = false }: Props) {
  const [selectedModelId, setSelectedModelId] = useState(initialModelId);
  const [inputTokens, setInputTokens] = useState(1500);
  const [outputTokens, setOutputTokens] = useState(800);
  const [cacheHitPercent, setCacheHitPercent] = useState(30);
  const [dailyRequests, setDailyRequests] = useState(500);

  const selectedModel = useMemo(() => {
    return models.find((m) => m.id === selectedModelId) || models[0];
  }, [models, selectedModelId]);

  // Single request cost calculation
  const singleCost = useMemo(() => {
    return calculateCost(selectedModel, inputTokens, outputTokens, cacheHitPercent / 100);
  }, [selectedModel, inputTokens, outputTokens, cacheHitPercent]);

  // Monthly budget calculation (standard 30-day projection)
  const monthlyOfficialCost = singleCost.officialCost * dailyRequests * 30;
  const monthlyAggregatorCost = singleCost.aggregatorCost * dailyRequests * 30;
  const monthlySavings = Math.max(0, monthlyOfficialCost - monthlyAggregatorCost);

  // Smart alternative model recommendation
  const alternativeModel = useMemo(() => {
    if (selectedModel.officialPricing.inputPerM > 1.0) {
      return models.find((m) => m.id === 'deepseek-v3') || models.find((m) => m.id === 'gpt-4o-mini');
    }
    return null;
  }, [models, selectedModel]);

  const alternativeMonthlyCost = useMemo(() => {
    if (!alternativeModel) return null;
    const cost = calculateCost(alternativeModel, inputTokens, outputTokens, cacheHitPercent / 100);
    return cost.officialCost * dailyRequests * 30;
  }, [alternativeModel, inputTokens, outputTokens, cacheHitPercent, dailyRequests]);

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${embedded ? '' : 'max-w-4xl mx-auto'}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              AI Token Cost Calculator
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Simulate your monthly API expenses with Prompt Caching discounts &amp; Aggregator deals.
          </p>
        </div>

        {/* Model Selection */}
        <div className="flex items-center gap-2">
          <label htmlFor="calc-model" className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
            Model:
          </label>
          <select
            id="calc-model"
            value={selectedModelId}
            onChange={(e) => setSelectedModelId((e.target as HTMLSelectElement).value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.creatorName || m.providerName}) — ${m.officialPricing.inputPerM}/1M
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Parameter Control Grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Input Tokens (Prompt) */}
        <div>
          <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
            <span>Input Tokens (Prompt)</span>
            <span className="font-mono text-brand-600 dark:text-brand-400">{inputTokens.toLocaleString()}</span>
          </div>
          <input
            type="range"
            min="100"
            max="128000"
            step="100"
            value={inputTokens}
            onInput={(e) => setInputTokens(Number((e.target as HTMLInputElement).value))}
            className="mt-2 w-full accent-brand-600 cursor-pointer"
          />
          <div className="mt-1 flex justify-between text-[10px] text-slate-400 font-mono">
            <span>100</span>
            <span>32k</span>
            <span>128k</span>
          </div>
        </div>

        {/* Output Tokens (Completion) */}
        <div>
          <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
            <span>Output Tokens (Completion)</span>
            <span className="font-mono text-brand-600 dark:text-brand-400">{outputTokens.toLocaleString()}</span>
          </div>
          <input
            type="range"
            min="50"
            max="16000"
            step="50"
            value={outputTokens}
            onInput={(e) => setOutputTokens(Number((e.target as HTMLInputElement).value))}
            className="mt-2 w-full accent-brand-600 cursor-pointer"
          />
          <div className="mt-1 flex justify-between text-[10px] text-slate-400 font-mono">
            <span>50</span>
            <span>4k</span>
            <span>16k</span>
          </div>
        </div>

        {/* Prompt Cache Hit % */}
        <div>
          <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
            <span>Prompt Cache Hit</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">{cacheHitPercent}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={cacheHitPercent}
            onInput={(e) => setCacheHitPercent(Number((e.target as HTMLInputElement).value))}
            className="mt-2 w-full accent-emerald-500 cursor-pointer"
          />
          <div className="mt-1 flex justify-between text-[10px] text-slate-400 font-mono">
            <span>0% (No Cache)</span>
            <span>50%</span>
            <span>100% (Hot)</span>
          </div>
        </div>
      </div>

      {/* Daily Call Volume Slider */}
      <div className="mt-4 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
        <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
          <span>Daily API Calls (Volume Scale):</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">
            {dailyRequests.toLocaleString()} calls / day ({(dailyRequests * 30).toLocaleString()} / mo)
          </span>
        </div>
        <input
          type="range"
          min="10"
          max="50000"
          step="50"
          value={dailyRequests}
          onInput={(e) => setDailyRequests(Number((e.target as HTMLInputElement).value))}
          className="mt-2 w-full accent-brand-600 cursor-pointer"
        />
      </div>

      {/* Output Results Grid */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Single Call */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Single Call Cost</div>
          <div className="mt-1 font-mono text-xl font-extrabold text-slate-900 dark:text-white">
            ${singleCost.officialCost.toFixed(5)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Per request average cost
          </div>
        </div>

        {/* Official Monthly Bill */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Official Monthly Bill</div>
          <div className="mt-1 font-mono text-2xl font-black text-slate-900 dark:text-white">
            ${monthlyOfficialCost.toFixed(2)}
            <span className="text-xs font-normal text-slate-400"> / mo</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Direct Lab rate: ${selectedModel.officialPricing.inputPerM}/1M in · ${selectedModel.officialPricing.outputPerM}/1M out
          </div>
        </div>

        {/* Aggregator Best Deal */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            Via Hosting &amp; Relays
          </div>
          <div className="mt-1 font-mono text-2xl font-black text-emerald-700 dark:text-emerald-300">
            ${monthlyAggregatorCost.toFixed(2)}
            <span className="text-xs font-normal text-emerald-600/70 dark:text-emerald-400"> / mo</span>
          </div>
          <div className="mt-1 text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
            {monthlySavings > 0.01 ? (
              <span>Saves ${monthlySavings.toFixed(2)}/mo ({singleCost.savingsPercent.toFixed(1)}%)</span>
            ) : (
              <span>Official rate matches best host</span>
            )}
          </div>
        </div>
      </div>

      {/* Smart Alternative Recommendation */}
      {alternativeModel && alternativeMonthlyCost !== null && (
        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/80 px-4 py-3 text-xs text-brand-900 dark:border-brand-900/60 dark:bg-brand-950/40 dark:text-brand-200">
          <div className="flex items-center gap-2">
            <span className="rounded bg-brand-600 px-1.5 py-0.5 font-bold text-white text-[10px]">SMART TIP</span>
            <span>
              Switching from <strong>{selectedModel.name}</strong> to <strong>{alternativeModel.name}</strong> drops your monthly cost from <strong>${monthlyOfficialCost.toFixed(2)}</strong> down to <strong>${alternativeMonthlyCost.toFixed(2)}</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedModelId(alternativeModel.id)}
            className="shrink-0 rounded-lg bg-brand-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand-500 transition shadow-sm"
          >
            Switch to {alternativeModel.name} &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
