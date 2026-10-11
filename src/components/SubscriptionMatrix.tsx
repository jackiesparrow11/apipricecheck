import { useState, useMemo } from 'preact/hooks';
import type { SubscriptionService, SubscriptionPlan } from '../data/types';

interface Props {
  services: SubscriptionService[];
}

export default function SubscriptionMatrix({ services }: Props) {
  const [selectedServiceId, setSelectedServiceId] = useState<string>('all');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Flatten all plans with parent service reference
  const allPlans = useMemo(() => {
    const list: { plan: SubscriptionPlan; service: SubscriptionService }[] = [];
    services.forEach((s) => {
      s.plans.forEach((p) => {
        list.push({ plan: p, service: s });
      });
    });
    return list;
  }, [services]);

  const filteredPlans = useMemo(() => {
    return allPlans.filter(({ plan, service }) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = plan.name.toLowerCase().includes(q);
        const matchService = service.name.toLowerCase().includes(q);
        const matchCompany = service.company.toLowerCase().includes(q);
        const matchModel = plan.includedModels.some((m) => m.toLowerCase().includes(q));
        const matchFeature = plan.features.some((f) => f.toLowerCase().includes(q));
        if (!matchName && !matchService && !matchCompany && !matchModel && !matchFeature) return false;
      }

      // Service filter
      if (selectedServiceId !== 'all' && service.id !== selectedServiceId) {
        return false;
      }

      // Tier filter
      if (selectedTier !== 'all') {
        if (selectedTier === 'free' && plan.priceMonthly !== 0) return false;
        if (selectedTier === 'pro' && (plan.priceMonthly < 10 || plan.priceMonthly > 35)) return false;
        if (selectedTier === 'power' && plan.priceMonthly < 90) return false;
        if (selectedTier === 'team' && plan.tier !== 'team') return false;
      }

      return true;
    });
  }, [allPlans, selectedServiceId, selectedTier, searchQuery]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
      {/* Filter and View Controls */}
      <div className="border-b border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Filter by subscription, model (o1, Sonnet 3.7), feature..."
              value={searchQuery}
              onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Tier Segmented Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 shrink-0">Tier:</span>
            {[
              { id: 'all', label: 'All Plans' },
              { id: 'free', label: 'Free ($0)' },
              { id: 'pro', label: 'Pro (~$20/mo)' },
              { id: 'power', label: 'Power ($100-$300)' },
              { id: 'team', label: 'Team / Seats' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTier(t.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition shrink-0 ${
                  selectedTier === t.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Table vs Card View Toggle */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-label="Table view"
              className={`rounded-lg p-1.5 transition ${
                viewMode === 'table' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              aria-label="Cards view"
              className={`rounded-lg p-1.5 transition ${
                viewMode === 'cards' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Brand / Service Pills */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-200/60 dark:border-slate-800/60 scrollbar-none">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 shrink-0 mr-1">Brand:</span>
          <button
            type="button"
            onClick={() => setSelectedServiceId('all')}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition shrink-0 ${
              selectedServiceId === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            All Services ({services.length})
          </button>
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedServiceId(s.id)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition shrink-0 flex items-center gap-1.5 ${
                selectedServiceId === s.id
                  ? 'bg-brand-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <span>{s.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Table or Cards */}
      {viewMode === 'table' ? (
        <div className="table-container max-h-[720px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-50/95 text-[11px] font-bold uppercase tracking-wider text-slate-500 backdrop-blur-sm border-b border-slate-200 dark:bg-slate-800/95 dark:text-slate-400 dark:border-slate-700">
              <tr>
                <th scope="col" className="sticky left-0 z-30 bg-slate-50/95 px-4 py-3.5 backdrop-blur-sm shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-800/95 dark:shadow-[1px_0_0_0_rgb(51,65,85)] min-w-[200px]">
                  Subscription Plan
                </th>
                <th scope="col" className="px-4 py-3.5 min-w-[120px]">Price</th>
                <th scope="col" className="px-4 py-3.5 min-w-[220px]">Included Models</th>
                <th scope="col" className="px-4 py-3.5 min-w-[110px]">Context</th>
                <th scope="col" className="px-4 py-3.5 min-w-[200px]">Rate Limits &amp; Quotas</th>
                <th scope="col" className="px-4 py-3.5 min-w-[240px]">Key Features &amp; Perks</th>
                <th scope="col" className="px-4 py-3.5 text-right min-w-[120px]">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs dark:divide-slate-800">
              {filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No subscription plans match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredPlans.map(({ plan, service }) => (
                  <tr key={plan.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    {/* Sticky Plan Name & Service */}
                    <td className="sticky left-0 z-10 bg-white px-4 py-3.5 font-medium text-slate-900 shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-900 dark:text-white dark:shadow-[1px_0_0_0_rgb(51,65,85)]">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {plan.name}
                          </span>
                          {plan.status === 'popular' && (
                            <span className="rounded bg-brand-100 px-1.5 py-0.2 text-[9px] font-bold text-brand-700 dark:bg-brand-900/50 dark:text-brand-300 uppercase">
                              Popular
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`inline-flex rounded px-1.5 py-0.2 text-[10px] font-semibold border ${service.badgeColor}`}>
                            {service.name}
                          </span>
                          <span className="text-[10px] text-slate-400">by {service.company}</span>
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3.5 font-mono">
                      {plan.priceMonthly === 0 ? (
                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Free ($0)
                        </span>
                      ) : plan.pricePerSeatMonthly ? (
                        <div>
                          <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                            ${plan.pricePerSeatMonthly}
                          </span>
                          <span className="text-[10px] text-slate-400"> / seat / mo</span>
                          {plan.minSeats && (
                            <div className="text-[10px] text-slate-400">min {plan.minSeats} seats</div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className="font-extrabold text-slate-900 dark:text-white text-base">
                            ${plan.priceMonthly}
                          </span>
                          <span className="text-[10px] text-slate-400"> / month</span>
                          {plan.priceYearly && (
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              ${plan.priceYearly}/yr billed annually
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Included Models */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {plan.includedModels.map((m) => (
                          <span
                            key={m}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Context Window */}
                    <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-300">
                      {plan.contextWindow}
                    </td>

                    {/* Rate Limits */}
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 text-[11px]">
                      {plan.rateLimits}
                    </td>

                    {/* Key Features */}
                    <td className="px-4 py-3.5">
                      <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300 list-disc list-inside">
                        {plan.features.slice(0, 3).map((f) => (
                          <li key={f} className="line-clamp-1">{f}</li>
                        ))}
                      </ul>
                      {plan.apiCreditIncluded && (
                        <div className="mt-1.5 inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          ⚡ {plan.apiCreditIncluded}
                        </div>
                      )}
                    </td>

                    {/* Details Action */}
                    <td className="px-4 py-3.5 text-right">
                      <a
                        href={`/subscriptions/${service.id}/`}
                        className="inline-flex items-center rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-600 hover:text-white dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300 transition"
                      >
                        Guide &rarr;
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Card Grid View */
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlans.map(({ plan, service }) => (
            <div
              key={plan.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold border ${service.badgeColor}`}>
                    {service.name}
                  </span>
                  {plan.status === 'popular' && (
                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-900/50 dark:text-brand-300 uppercase">
                      Popular
                    </span>
                  )}
                </div>

                <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                  {plan.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {plan.bestFor}
                </p>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                    {plan.priceMonthly === 0 ? '$0' : `$${plan.priceMonthly || plan.pricePerSeatMonthly}`}
                  </span>
                  <span className="text-xs text-slate-400">
                    {plan.pricePerSeatMonthly ? '/ seat / month' : '/ month'}
                  </span>
                </div>

                <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Included Models:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {plan.includedModels.map((m) => (
                      <span key={m} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {m}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Key Features:
                  </div>
                  <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    {plan.features.slice(0, 4).map((f) => (
                      <li key={f} className="flex items-start gap-1.5">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.apiCreditIncluded && (
                    <div className="mt-2 rounded bg-amber-50 p-2 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      ⚡ API Credit: {plan.apiCreditIncluded}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <a
                  href={`/subscriptions/${service.id}/`}
                  className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                >
                  Read Detailed Guide &rarr;
                </a>
                <a
                  href={service.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-brand-600 dark:hover:bg-brand-500 transition"
                >
                  Subscribe
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer counter */}
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 flex items-center justify-between">
        <div>
          Showing {filteredPlans.length} plans across {services.length} services
        </div>
        <div className="text-slate-400">
          Updated daily from official subscription portals
        </div>
      </div>
    </div>
  );
}
