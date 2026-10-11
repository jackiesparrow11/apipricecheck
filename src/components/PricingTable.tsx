import { useState, useMemo, useEffect } from 'preact/hooks';
import type { ModelRecord, HostingOffer } from '../data/types';
import { providersList } from '../data/providers';

interface Props {
  models: ModelRecord[];
  totalModelsCount?: number;
  filterProvider?: string;
  hasMoreModels?: boolean;
}

export default function PricingTable({ models, totalModelsCount, filterProvider, hasMoreModels = false }: Props) {
  const [tableModels, setTableModels] = useState<ModelRecord[]>(models);
  const [isFullLoaded, setIsFullLoaded] = useState(!hasMoreModels);
  const [isLoadingFull, setIsLoadingFull] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'creator' | 'host'>('all');
  const [selectedProvider, setSelectedProvider] = useState<string>(filterProvider || 'all');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'input' | 'output' | 'context' | 'name'>('input');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedModelId, setExpandedModelId] = useState<string | null>(null);

  // Load full directory asynchronously from /api/pricing.json
  const loadAllModels = async () => {
    if (isFullLoaded || isLoadingFull) return;
    setIsLoadingFull(true);
    try {
      const res = await fetch('/api/pricing.json');
      if (res.ok) {
        const json = await res.json();
        if (json?.data && Array.isArray(json.data)) {
          setTableModels(json.data);
          setIsFullLoaded(true);
        }
      }
    } catch (err) {
      console.error('Failed to load full pricing directory:', err);
    } finally {
      setIsLoadingFull(false);
    }
  };

  // Idle background prefetch after 2.5s
  useEffect(() => {
    if (!isFullLoaded && hasMoreModels) {
      const timer = setTimeout(() => {
        loadAllModels();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [hasMoreModels, isFullLoaded]);

  // Auto-fetch full catalog if user interacts with search or filters
  useEffect(() => {
    if (searchQuery.trim() || selectedProvider !== 'all' || selectedTier !== 'all' || categoryFilter !== 'all') {
      if (!isFullLoaded) {
        loadAllModels();
      }
    }
  }, [searchQuery, selectedProvider, selectedTier, categoryFilter, isFullLoaded]);

  // Extract unique creators and hosting providers present in dataset
  const availableCreators = useMemo(() => {
    const set = new Set<string>();
    tableModels.forEach((m) => {
      if (m.creator) set.add(m.creator);
    });
    return Array.from(set);
  }, [tableModels]);

  const availableHosts = useMemo(() => {
    const set = new Set<string>();
    tableModels.forEach((m) => {
      m.hostingOffers?.forEach((h) => set.add(h.hostId));
    });
    return Array.from(set);
  }, [tableModels]);

  // Filter and sort models
  const filteredModels = useMemo(() => {
    return tableModels
      .filter((m) => {
        // Text search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = m.name.toLowerCase().includes(q);
          const matchCreator = (m.creatorName || '').toLowerCase().includes(q);
          const matchFamily = m.family.toLowerCase().includes(q);
          const matchHost = m.hostingOffers?.some((h) => h.hostName.toLowerCase().includes(q));
          if (!matchName && !matchCreator && !matchFamily && !matchHost) return false;
        }

        // Category filter (Creators vs Hosts)
        if (categoryFilter === 'creator') {
          // If a specific provider is chosen, it must match creator
          if (selectedProvider !== 'all' && m.creator !== selectedProvider) return false;
        } else if (categoryFilter === 'host') {
          // Model must have hosting offers
          if (!m.hostingOffers || m.hostingOffers.length === 0) return false;
          if (selectedProvider !== 'all' && !m.hostingOffers.some((h) => h.hostId === selectedProvider)) return false;
        } else {
          // 'all' category
          if (selectedProvider !== 'all') {
            const isCreatorMatch = m.creator === selectedProvider;
            const isHostMatch = m.hostingOffers?.some((h) => h.hostId === selectedProvider);
            if (!isCreatorMatch && !isHostMatch) return false;
          }
        }

        // Tier filter
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
  }, [tableModels, searchQuery, categoryFilter, selectedProvider, selectedTier, sortBy, sortOrder]);

  const handleSort = (key: 'input' | 'output' | 'context' | 'name') => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  // Color scale helper for prices
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

  const getBestOffer = (m: ModelRecord): HostingOffer | null => {
    if (!m.hostingOffers || m.hostingOffers.length === 0) return null;
    return m.hostingOffers.reduce((best, curr) => {
      const bestCost = best.inputPerM + best.outputPerM;
      const currCost = curr.inputPerM + curr.outputPerM;
      return currCost < bestCost ? curr : best;
    }, m.hostingOffers[0]);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
      {/* Top Filter and Search Control Bar */}
      <div className="border-b border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Live Search Input */}
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search model, creator (OpenAI, DeepSeek), or host (AWS, Groq)..."
              value={searchQuery}
              onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Category Toggle: All vs Model Labs vs Cloud Hosts & Relays */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900 shadow-sm shrink-0">
            <button
              type="button"
              onClick={() => { setCategoryFilter('all'); setSelectedProvider('all'); }}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                categoryFilter === 'all'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              All Providers
            </button>
            <button
              type="button"
              onClick={() => { setCategoryFilter('creator'); setSelectedProvider('all'); }}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition flex items-center gap-1 ${
                categoryFilter === 'creator'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <span>Model Creators</span>
              <span className="text-[10px] opacity-75">({availableCreators.length})</span>
            </button>
            <button
              type="button"
              onClick={() => { setCategoryFilter('host'); setSelectedProvider('all'); }}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition flex items-center gap-1 ${
                categoryFilter === 'host'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <span>Cloud Hosts &amp; Relays</span>
              <span className="text-[10px] opacity-75">({availableHosts.length})</span>
            </button>
          </div>

          {/* Tier Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 shrink-0">Tier:</span>
            {['all', 'Budget', 'Mid', 'Flagship', 'Reasoning'].map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setSelectedTier(tier)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition shrink-0 ${
                  selectedTier.toLowerCase() === tier.toLowerCase()
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {tier === 'all' ? 'All' : tier}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Provider Pills */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-200/60 dark:border-slate-800/60 scrollbar-none">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
            {categoryFilter === 'creator' ? 'Creator Lab:' : categoryFilter === 'host' ? 'Host / Relay:' : 'Filter:'}
          </span>
          <button
            type="button"
            onClick={() => setSelectedProvider('all')}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition shrink-0 ${
              selectedProvider === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            All
          </button>

          {/* If Creator view or All view */}
          {categoryFilter !== 'host' &&
            availableCreators.map((c) => {
              const info = providersList.find((p) => p.id === c);
              const label = info?.navLabel || info?.name || c;
              return (
                <button
                  key={`c-${c}`}
                  type="button"
                  onClick={() => setSelectedProvider(c)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition shrink-0 ${
                    selectedProvider === c
                      ? 'bg-brand-600 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {label}
                </button>
              );
            })}

          {/* If Host view */}
          {categoryFilter === 'host' &&
            availableHosts.map((h) => {
              const info = providersList.find((p) => p.id === h);
              const label = info?.name || h;
              return (
                <button
                  key={`h-${h}`}
                  type="button"
                  onClick={() => setSelectedProvider(h)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition shrink-0 ${
                    selectedProvider === h
                      ? 'bg-brand-600 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {label}
                </button>
              );
            })}
        </div>
      </div>

      {/* Dynamic Directory Loading Banner */}
      {!isFullLoaded && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-brand-50/80 px-4 py-2.5 text-xs border-y border-brand-100 text-brand-900 dark:bg-brand-950/40 dark:border-brand-900/40 dark:text-brand-200">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="inline-block h-2 w-2 rounded-full bg-brand-500 animate-pulse"></span>
            Showing top 20 flagship models on initial load for instant performance.
          </span>
          <button
            type="button"
            onClick={loadAllModels}
            disabled={isLoadingFull}
            className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-brand-500 disabled:opacity-50 transition"
          >
            {isLoadingFull ? 'Loading 375+ Models...' : `Load Full Directory (${totalModelsCount || 375}+ Models)`}
          </button>
        </div>
      )}

      {/* Responsive Data Table */}
      <div className="table-container max-h-[720px] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-20 bg-slate-50/95 text-[11px] font-bold uppercase tracking-wider text-slate-500 backdrop-blur-sm border-b border-slate-200 dark:bg-slate-800/95 dark:text-slate-400 dark:border-slate-700">
            <tr>
              {/* Sticky first column */}
              <th scope="col" className="sticky left-0 z-30 bg-slate-50/95 px-4 py-3.5 backdrop-blur-sm shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-800/95 dark:shadow-[1px_0_0_0_rgb(51,65,85)] min-w-[220px]">
                <button type="button" onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white">
                  Model &amp; Creator Lab
                  <span>{sortBy === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}</span>
                </button>
              </th>
              <th scope="col" className="px-4 py-3.5 min-w-[95px]">
                <button type="button" onClick={() => handleSort('context')} className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white">
                  Context
                  <span>{sortBy === 'context' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}</span>
                </button>
              </th>
              <th scope="col" className="px-4 py-3.5 min-w-[125px]">
                <button type="button" onClick={() => handleSort('input')} className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white">
                  Official In / 1M
                  <span>{sortBy === 'input' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}</span>
                </button>
              </th>
              <th scope="col" className="px-4 py-3.5 min-w-[110px]">Cached In</th>
              <th scope="col" className="px-4 py-3.5 min-w-[130px]">
                <button type="button" onClick={() => handleSort('output')} className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white">
                  Official Out / 1M
                  <span>{sortBy === 'output' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}</span>
                </button>
              </th>
              <th scope="col" className="px-4 py-3.5 min-w-[220px] bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300">
                Hosting Providers &amp; Relays
              </th>
              <th scope="col" className="px-4 py-3.5 text-right min-w-[100px]">Action</th>
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
                const bestOffer = getBestOffer(m);
                const isDiscounted = bestOffer && (bestOffer.inputPerM < m.officialPricing.inputPerM || bestOffer.outputPerM < m.officialPricing.outputPerM);
                const isExpanded = expandedModelId === m.id;
                const hasMultipleHosts = m.hostingOffers && m.hostingOffers.length > 1;

                return (
                  <>
                    <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      {/* Sticky First Column */}
                      <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-slate-900 shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-900 dark:text-white dark:shadow-[1px_0_0_0_rgb(51,65,85)]">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`/pricing/${m.creator || m.provider}/`}
                              className="font-bold text-slate-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-400 hover:underline"
                            >
                              {m.name}
                            </a>
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
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <a
                              href={`/pricing/${m.creator || m.provider}/`}
                              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                            >
                              {m.creatorName}
                            </a>
                            <span className="text-slate-300 dark:text-slate-700">·</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {m.family}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Context Window */}
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                        {m.contextWindow >= 1000000
                          ? `${(m.contextWindow / 1000000).toFixed(1)}M`
                          : `${(m.contextWindow / 1000).toFixed(0)}k`}
                      </td>

                      {/* Official Input Price */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono font-semibold ${getInputBadgeClass(m.officialPricing.inputPerM)}`}>
                          ${m.officialPricing.inputPerM.toFixed(m.officialPricing.inputPerM < 0.1 ? 3 : 2)}
                        </span>
                      </td>

                      {/* Cached Input Price */}
                      <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">
                        ${m.officialPricing.cachedInputPerM.toFixed(m.officialPricing.cachedInputPerM < 0.05 ? 4 : 2)}
                      </td>

                      {/* Official Output Price */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono font-semibold ${getOutputBadgeClass(m.officialPricing.outputPerM)}`}>
                          ${m.officialPricing.outputPerM.toFixed(2)}
                        </span>
                      </td>

                      {/* Hosting Providers & Relays */}
                      <td className="px-4 py-3 bg-emerald-50/20 dark:bg-emerald-950/10">
                        {bestOffer ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-1.5">
                              <div>
                                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                                  ${bestOffer.inputPerM.toFixed(2)} / ${bestOffer.outputPerM.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1.5 font-medium">
                                  via {bestOffer.hostName}
                                </span>
                              </div>
                              {isDiscounted && (
                                <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  Save $
                                </span>
                              )}
                            </div>

                            {/* Host badges list & expand toggle */}
                            <div className="flex items-center gap-1 flex-wrap">
                              {m.hostingOffers?.map((h) => (
                                <span
                                  key={h.hostId}
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-mono border ${
                                    h.hostId === bestOffer.hostId
                                      ? 'bg-emerald-100/70 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                      : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                  }`}
                                >
                                  {h.hostName}
                                  {h.tokensPerSec ? ` (${h.tokensPerSec} t/s)` : ''}
                                </span>
                              ))}

                              {hasMultipleHosts && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedModelId(isExpanded ? null : m.id)}
                                  className="text-[10px] text-brand-600 hover:underline dark:text-brand-400 font-medium ml-1"
                                >
                                  {isExpanded ? 'Hide' : `Compare ${m.hostingOffers.length} Hosts ⌄`}
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Direct Only</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        {bestOffer ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={`/pricing/${m.creator || m.provider}/`}
                              className="inline-flex items-center rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 transition"
                            >
                              Details
                            </a>
                            <a
                              href={bestOffer.outboundUrl}
                              target="_blank"
                              rel="sponsored nofollow noopener"
                              className="inline-flex items-center rounded-lg border border-brand-200 bg-brand-50/70 px-2.5 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-600 hover:text-white dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300 transition"
                            >
                              Try API &rarr;
                            </a>
                          </div>
                        ) : (
                          <a
                            href={`/pricing/${m.creator || m.provider}/`}
                            className="inline-flex items-center rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 transition"
                          >
                            Details &rarr;
                          </a>
                        )}
                      </td>
                    </tr>

                    {/* Expanded Host Comparison Drawer */}
                    {isExpanded && (
                      <tr className="bg-slate-50/70 dark:bg-slate-800/40">
                        <td colSpan={7} className="px-4 py-3 pl-8">
                          <div className="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2">
                              All Verified Hosting &amp; Relay Offers for {m.name}:
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {m.hostingOffers?.map((h) => (
                                <div
                                  key={h.hostId}
                                  className="rounded-lg border border-slate-100 p-2.5 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-800/40 flex flex-col justify-between"
                                >
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-900 dark:text-white text-xs">
                                        {h.hostName}
                                      </span>
                                      <span className="rounded bg-slate-200/70 px-1 text-[9px] font-mono uppercase text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                        {h.hostType}
                                      </span>
                                    </div>
                                    <div className="mt-1 font-mono text-xs text-slate-700 dark:text-slate-200">
                                      In: ${h.inputPerM.toFixed(2)} / Out: ${h.outputPerM.toFixed(2)}
                                    </div>
                                    {h.tokensPerSec && (
                                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                                        ⚡ Speed: {h.tokensPerSec} tokens/sec
                                      </div>
                                    )}
                                    {h.notes && (
                                      <div className="text-[10px] text-slate-400 mt-0.5">
                                        {h.notes}
                                      </div>
                                    )}
                                  </div>
                                  <a
                                    href={h.outboundUrl}
                                    target="_blank"
                                    rel="sponsored nofollow noopener"
                                    className="mt-2 text-center rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-1 text-[10px] font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                                  >
                                    Visit Host Console &rarr;
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Color Scale & Model Counter */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Price Indicator:</span>
          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Budget (&lt;$0.15)
          </span>
          <span className="inline-flex items-center gap-1 text-sky-700 dark:text-sky-400">
            <span className="h-2 w-2 rounded-full bg-sky-500"></span> Mid ($0.15 - $1.00)
          </span>
          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
            <span className="h-2 w-2 rounded-full bg-amber-500"></span> Higher ($1.00 - $5.00)
          </span>
          <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400">
            <span className="h-2 w-2 rounded-full bg-rose-500"></span> Flagship (&gt;$5.00)
          </span>
        </div>
        <div className="font-mono text-slate-400">
          Showing {filteredModels.length} of {isFullLoaded ? tableModels.length : (totalModelsCount || tableModels.length)} AI models
          {!isFullLoaded && (
            <button
              type="button"
              onClick={loadAllModels}
              disabled={isLoadingFull}
              className="ml-2 text-brand-600 underline font-medium hover:text-brand-700 dark:text-brand-400"
            >
              {isLoadingFull ? 'Loading...' : `(Load All ${totalModelsCount || 375}+)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
