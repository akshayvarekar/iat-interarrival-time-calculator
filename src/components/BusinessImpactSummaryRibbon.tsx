import React from 'react';
import { BusinessImpactSummary } from '../types';

interface BusinessImpactSummaryRibbonProps {
  summary: BusinessImpactSummary;
  activeRiskFilter: string;
  onSelectRiskFilter: (risk: string) => void;
}

export const BusinessImpactSummaryRibbon: React.FC<BusinessImpactSummaryRibbonProps> = ({
  summary,
  activeRiskFilter,
  onSelectRiskFilter,
}) => {
  const formatUSD = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const riskFilters = [
    { id: 'all', label: 'All Items', count: summary.totalCount },
    {
      id: 'understated',
      label: 'Stockout Risk (Understated)',
      count: summary.stockoutRiskCount,
      dotColor: 'bg-red-600',
    },
    {
      id: 'overstated',
      label: 'Excess Carrying (Overstated)',
      count: summary.excessCarryingCostCount,
      dotColor: 'bg-amber-600',
    },
    {
      id: 'no_gap',
      label: 'No Gap (Aligned)',
      count: summary.noGapCount,
      dotColor: 'bg-emerald-600',
    },
  ];

  return (
    <div className="space-y-2 text-xs">
      {/* Enterprise KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {/* Understated / Stockout Risk */}
        <div className="bg-white border border-slate-200 rounded p-2.5">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
              Total $ Understated (Stockout Risk)
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-red-700 mt-1">
            {formatUSD(summary.totalUnderstatedCost)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
            {summary.stockoutRiskCount} SKU-Sites requiring additional buffer
          </div>
        </div>

        {/* Overstated / Excess Carrying Cost */}
        <div className="bg-white border border-slate-200 rounded p-2.5">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
              Total $ Overstated (Carrying Cost)
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-amber-800 mt-1">
            {formatUSD(summary.totalOverstatedCost)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
            {summary.excessCarryingCostCount} SKU-Sites tying up unnecessary capital
          </div>
        </div>

        {/* Net Working Capital Delta */}
        <div className="bg-white border border-slate-200 rounded p-2.5">
          <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
            Net Working Capital Delta
          </div>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              summary.netImpactCost > 0
                ? 'text-red-700'
                : summary.netImpactCost < 0
                ? 'text-emerald-700'
                : 'text-slate-900'
            }`}
          >
            {summary.netImpactCost > 0 ? '+' : ''}
            {formatUSD(summary.netImpactCost)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
            Aggregate portfolio capital variance
          </div>
        </div>

        {/* Portfolio Coverage */}
        <div className="bg-white border border-slate-200 rounded p-2.5">
          <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
            SKU-Sites Evaluated
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {summary.totalCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {summary.noGapCount} aligned &bull; {summary.stockoutRiskCount} risk &bull; {summary.excessCarryingCostCount} excess
          </div>
        </div>
      </div>

      {/* Quick Filter Bar */}
      <div className="bg-white border border-slate-200 rounded p-1.5 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-semibold text-slate-600 px-1.5">Filter by Risk Category:</span>
        {riskFilters.map((r) => {
          const isActive = activeRiskFilter === r.id;
          return (
            <button
              key={r.id}
              onClick={() => onSelectRiskFilter(r.id)}
              className={`px-2 py-0.5 text-xs rounded border transition-colors cursor-pointer flex items-center space-x-1.5 ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {r.dotColor && <span className={`w-1.5 h-1.5 rounded-full ${r.dotColor}`} />}
              <span>{r.label}</span>
              <span
                className={`px-1 py-0.2 rounded text-[10px] font-mono ${
                  isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {r.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
