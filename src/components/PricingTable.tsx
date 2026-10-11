import { useState, useMemo } from 'preact/hooks';
import type { ModelRecord } from '../data/types';

interface Props {
  models: ModelRecord[];
  filterProvider?: string;
}

export default function PricingTable({ models, filterProvider }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>(filterProvider || 'all');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'input' | 'output' | 'context' | 'name'>('input');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // 提取可用厂商列表
  const providers = useMemo(() => {
    const set = new Set<string>();
    models.forEach((m) => set.add(m.provider));
    return Array.from(set);
  }, [models]);

  // 过滤与排序
  const filteredModels = useMemo(() => {
    return models
      .filter((m) => {
        // 搜索匹配
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchName = m.name.toLowerCase().includes(query);
          const matchProvider = m.providerName.toLowerCase().includes(query);
          const matchFamily = m.family.toLowerCase().includes(query);
          if (!matchName && !matchProvider && !matchFamily) return false;
        }

        // 厂商筛选
        if (selectedProvider !== 'all' && m.provider.toLowerCase() !== selectedProvider.toLowerCase()) {
          return false;
        }

        // 等级筛选
        if (selectedTier !== 'all' && m.tier.toLowerCase() !== selectedTier.toLowerCase()) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA = 0;
        let valB = 0;

        if (sortBy === 'input') {
          valA = a.officialPricing.inputPerM;
          valB = b.officialPricing.inputPerM;
        } else if (sortBy === 'output') {
          valA = a.officialPricing.outputPerM;
          valB = b.officialPricing.outputPerM;
        } else if (sortBy === 'context') {
          valA = a.contextWindow;
          valB = b.contextWindow;
        } else if (sortBy === 'name') {
          return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        }

        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
  }, [models, searchQuery, selectedProvider, selectedTier, sortBy, sortOrder]);

  const handleSort = (key: 'input' | 'output' | 'context' | 'name') => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  // 价格色阶函数 (对数分级)
  const getInputBadgeClass = (price: number) => {
    if (price <= 0.15) return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
    if (price <= 1.0) return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800';
    if (price <= 5.0) return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
  };

  const getOutputBadgeClass = (price: number) => {
    if (price <= 0.60) return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
    if (price <= 3.0) return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800';
    if (price <= 15.0) return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
      {/* 顶部过滤与搜索控制器 */}
      <div className="border-b border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* 实时搜索框 */}
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search model, creator, or architecture..."
              value={searchQuery}
              onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* 价格分级过滤 */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 shrink-0">Tier:</span>
            {['all', 'Low', 'Mid', 'High'].map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setSelectedTier(tier)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition shrink-0 ${
                  selectedTier.toLowerCase() === tier.toLowerCase()
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {tier === 'all' ? 'All Tiers' : tier}
              </button>
            ))}
          </div>
        </div>

        {/* 厂商快速标签胶囊栏 */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 shrink-0 mr-1">Provider:</span>
          <button
            type="button"
            onClick={() => setSelectedProvider('all')}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition shrink-0 ${
              selectedProvider === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            All ({models.length})
          </button>
          {providers.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setSelectedProvider(p)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize transition shrink-0 ${
                selectedProvider.toLowerCase() === p.toLowerCase()
                  ? 'bg-brand-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* 响应式数据表格 */}
      <div className="table-container max-h-[680px] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-20 bg-slate-50/95 text-[11px] font-bold uppercase tracking-wider text-slate-500 backdrop-blur-sm border-b border-slate-200 dark:bg-slate-800/95 dark:text-slate-400 dark:border-slate-700">
            <tr>
              {/* 吸左首列 */}
              <th scope="col" className="sticky left-0 z-30 bg-slate-50/95 px-4 py-3.5 backdrop-blur-sm shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-800/95 dark:shadow-[1px_0_0_0_rgb(51,65,85)] min-w-[200px]">
                <button type="button" onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white">
                  Model &amp; Creator
                  <span>{sortBy === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}</span>
                </button>
              </th>
              <th scope="col" className="px-4 py-3.5 min-w-[100px]">
                <button type="button" onClick={() => handleSort('context')} className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white">
                  Context
                  <span>{sortBy === 'context' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}</span>
                </button>
              </th>
              <th scope="col" className="px-4 py-3.5 min-w-[120px]">
                <button type="button" onClick={() => handleSort('input')} className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white">
                  Official Input / 1M
                  <span>{sortBy === 'input' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}</span>
                </button>
              </th>
              <th scope="col" className="px-4 py-3.5 min-w-[110px]">Cached Input</th>
              <th scope="col" className="px-4 py-3.5 min-w-[130px]">
                <button type="button" onClick={() => handleSort('output')} className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white">
                  Official Output / 1M
                  <span>{sortBy === 'output' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}</span>
                </button>
              </th>
              <th scope="col" className="px-4 py-3.5 min-w-[180px] bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300">
                Aggregator Best Deal
              </th>
              <th scope="col" className="px-4 py-3.5 text-right min-w-[100px]">Direct Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs dark:divide-slate-800">
            {filteredModels.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  No AI models found matching your search.
                </td>
              </tr>
            ) : (
              filteredModels.map((m) => {
                // 寻找最优聚合商出价
                const bestOffer = m.aggregatorOffers && m.aggregatorOffers.length > 0 ? m.aggregatorOffers[0] : null;
                const isDiscounted = bestOffer && (bestOffer.inputPerM < m.officialPricing.inputPerM || bestOffer.outputPerM < m.officialPricing.outputPerM);

                return (
                  <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    {/* 吸左首列：模型名与厂商标签 */}
                    <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-slate-900 shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-900 dark:text-white dark:shadow-[1px_0_0_0_rgb(51,65,85)]">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900 dark:text-white hover:text-brand-600 transition">
                            {m.name}
                          </span>
                          {m.isFlagship && (
                            <span className="rounded bg-brand-100 px-1 py-0.2 text-[9px] font-bold text-brand-700 dark:bg-brand-900/50 dark:text-brand-300 uppercase">
                              Flagship
                            </span>
                          )}
                          {m.isCheapestInTier && (
                            <span className="rounded bg-emerald-100 px-1 py-0.2 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 uppercase">
                              Best Value
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-normal">
                          {m.providerName} · {m.family}
                        </span>
                      </div>
                    </td>

                    {/* 上下文窗口 */}
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                      {(m.contextWindow / 1000).toFixed(0)}k
                    </td>

                    {/* 官方输入价格 */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono font-semibold ${getInputBadgeClass(m.officialPricing.inputPerM)}`}>
                        ${m.officialPricing.inputPerM.toFixed(m.officialPricing.inputPerM < 0.1 ? 3 : 2)}
                      </span>
                    </td>

                    {/* 缓存命中价格 */}
                    <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">
                      ${m.officialPricing.cachedInputPerM.toFixed(m.officialPricing.cachedInputPerM < 0.05 ? 4 : 2)}
                    </td>

                    {/* 官方输出价格 */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono font-semibold ${getOutputBadgeClass(m.officialPricing.outputPerM)}`}>
                        ${m.officialPricing.outputPerM.toFixed(2)}
                      </span>
                    </td>

                    {/* 聚合商最优出价 (核心差异化) */}
                    <td className="px-4 py-3 bg-emerald-50/20 dark:bg-emerald-950/10">
                      {bestOffer ? (
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                              ${bestOffer.inputPerM.toFixed(2)} / ${bestOffer.outputPerM.toFixed(2)}
                            </span>
                            <div className="text-[10px] text-slate-400 font-normal">
                              via {bestOffer.name}
                            </div>
                          </div>
                          {isDiscounted && (
                            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Save $
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">Official Only</span>
                      )}
                    </td>

                    {/* 快速直达按钮 */}
                    <td className="px-4 py-3 text-right">
                      {bestOffer ? (
                        <a
                          href={bestOffer.outboundUrl}
                          target="_blank"
                          rel="noopener sponsored"
                          data-analytics="outbound_click"
                          data-provider={m.provider}
                          data-model={m.id}
                          className="inline-flex items-center rounded-lg border border-brand-200 bg-brand-50/50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-600 hover:text-white dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300 transition"
                        >
                          Try API &rarr;
                        </a>
                      ) : (
                        <a
                          href={`/pricing/${m.provider}/`}
                          className="inline-flex items-center rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 transition"
                        >
                          Details
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 底部色阶图例解释 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Color Scale (Logarithmic):</span>
          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Lowest
          </span>
          <span className="inline-flex items-center gap-1 text-sky-700 dark:text-sky-400">
            <span className="h-2 w-2 rounded-full bg-sky-500"></span> Lower
          </span>
          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
            <span className="h-2 w-2 rounded-full bg-amber-500"></span> Higher
          </span>
          <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400">
            <span className="h-2 w-2 rounded-full bg-rose-500"></span> Highest
          </span>
        </div>
        <div className="font-mono text-slate-400">
          Showing {filteredModels.length} of {models.length} AI models
        </div>
      </div>
    </div>
  );
}
