import React from 'react';
import { IATSummary } from '../types';

interface SummaryCardsProps {
  summary: IATSummary;
  activeRuleFilter: string;
  onSelectRuleFilter: (ruleType: string) => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  summary,
  activeRuleFilter,
  onSelectRuleFilter,
}) => {
  const oldPct = summary.totalSkuSites > 0 ? (summary.oldSkuSitesCount / summary.totalSkuSites) * 100 : 0;
  const newPct = summary.totalSkuSites > 0 ? (summary.newSkuSitesCount / summary.totalSkuSites) * 100 : 0;

  const ruleFilters = [
    { id: 'all', label: 'All', count: summary.totalSkuSites },
    { id: 'direct_hub', label: 'Direct Hub DC (Weeks)', count: summary.directHubCount },
    { id: 'direct_spoke', label: 'Direct Spoke DC (Days)', count: summary.directSpokeCount },
    { id: 'gtin_sub', label: 'GTIN Sub (5a)', count: summary.gtinSubCount },
    { id: 'segment_sub', label: 'Segment Sub (5b)', count: summary.segmentSubCount },
    { id: 'default', label: 'Default 182d (5c)', count: summary.defaultCount },
  ];

  return (
    <div className="space-y-2 text-xs">
      {/* Metric Summary Tiles (Tableau / Power BI KPI Row) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="bg-white border border-slate-200 rounded p-2.5">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
            Total SKU-Sites
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
            {summary.totalSkuSites}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Active portfolio combinations
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-2.5">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
            Old vs. New SKU-Sites
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-0.5 flex items-baseline gap-1.5">
            <span>{summary.oldSkuSitesCount}</span>
            <span className="text-xs font-normal text-slate-500">Old ({oldPct.toFixed(0)}%)</span>
            <span className="text-slate-300">/</span>
            <span>{summary.newSkuSitesCount}</span>
            <span className="text-xs font-normal text-slate-500">New ({newPct.toFixed(0)}%)</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            First receipt &gt; 90 days vs &le; 90 days
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-2.5">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
            Direct Receipts Computed
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
            {summary.directHubCount + summary.directSpokeCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {summary.directHubCount} Hub DC (Weeks) + {summary.directSpokeCount} Spoke DC (Days)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-2.5">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
            Substitutions Applied
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
            {summary.gtinSubCount + summary.segmentSubCount + summary.defaultCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {summary.gtinSubCount} GTIN + {summary.segmentSubCount} Segment + {summary.defaultCount} Default
          </div>
        </div>
      </div>

      {/* Logic Rule Filter Buttons */}
      <div className="bg-white border border-slate-200 rounded p-1.5 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-semibold text-slate-600 px-1.5">Filter by Logic:</span>
        {ruleFilters.map((r) => {
          const isActive = activeRuleFilter === r.id;
          return (
            <button
              key={r.id}
              onClick={() => onSelectRuleFilter(r.id)}
              className={`px-2 py-0.5 text-xs rounded border transition-colors cursor-pointer flex items-center space-x-1.5 ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
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
