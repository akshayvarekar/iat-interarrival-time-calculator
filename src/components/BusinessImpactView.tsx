import React, { useState, useMemo } from 'react';
import { BusinessImpactRow, BusinessImpactSummary } from '../types';
import { BusinessImpactSummaryRibbon } from './BusinessImpactSummaryRibbon';
import { BusinessImpactChart } from './BusinessImpactChart';
import { BusinessImpactTable } from './BusinessImpactTable';

interface BusinessImpactViewProps {
  rows: BusinessImpactRow[];
  summary: BusinessImpactSummary;
  errors?: string[];
  onExportExcel: () => void;
  onUploadDemandCostCsv: (file: File) => void;
}

export const BusinessImpactView: React.FC<BusinessImpactViewProps> = ({
  rows,
  summary,
  errors = [],
  onExportExcel,
  onUploadDemandCostCsv,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [activeRiskFilter, setActiveRiskFilter] = useState('all');

  // Filter rows based on search, site, and active risk category
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // Search term filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesSku = row.sku.toLowerCase().includes(q);
        const matchesSite = row.site.toLowerCase().includes(q);
        const matchesDesc = row.partDescription.toLowerCase().includes(q);
        if (!matchesSku && !matchesSite && !matchesDesc) return false;
      }

      // Site filter
      if (siteFilter !== 'all' && row.site !== siteFilter) {
        return false;
      }

      // Risk category filter
      if (activeRiskFilter === 'understated') {
        if (row.deltaUnits <= 0.001) return false;
      } else if (activeRiskFilter === 'overstated') {
        if (row.deltaUnits >= -0.001) return false;
      } else if (activeRiskFilter === 'no_gap') {
        if (Math.abs(row.deltaUnits) > 0.001) return false;
      }

      return true;
    });
  }, [rows, searchTerm, siteFilter, activeRiskFilter]);

  // Recalculate summary live if filtered
  const displayedSummary = useMemo(() => {
    let totalUnderstatedCost = 0;
    let totalOverstatedCost = 0;
    let netImpactCost = 0;
    let stockoutRiskCount = 0;
    let excessCarryingCostCount = 0;
    let noGapCount = 0;

    filteredRows.forEach((r) => {
      netImpactCost += r.deltaCostUSD;
      if (r.deltaCostUSD > 0.001) {
        totalUnderstatedCost += r.deltaCostUSD;
        stockoutRiskCount += 1;
      } else if (r.deltaCostUSD < -0.001) {
        totalOverstatedCost += Math.abs(r.deltaCostUSD);
        excessCarryingCostCount += 1;
      } else {
        noGapCount += 1;
      }
    });

    return {
      totalCount: filteredRows.length,
      totalUnderstatedCost,
      totalOverstatedCost,
      netImpactCost,
      stockoutRiskCount,
      excessCarryingCostCount,
      noGapCount,
    };
  }, [filteredRows]);

  return (
    <div className="space-y-3">
      {/* Plain Enterprise Section Header (No dark gradient hero banner) */}
      <div className="bg-white rounded border border-slate-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Business Impact &amp; Working Capital Analysis
          </h2>
          <p className="text-xs text-slate-500">
            Evaluates cycle stock requirements using actual calculated IAT vs. static baseline lead time assumptions from <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.2 rounded">demand_and_cost.csv</code>.
          </p>
        </div>

        <div className="text-xs text-slate-500 font-mono self-start sm:self-auto bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
          Cycle Stock = Daily Demand &times; Days / 2
        </div>
      </div>

      {/* Errors or Validation Messages */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-2.5 text-xs text-red-800 space-y-1">
          <div className="font-bold flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-red-600" />
            <span>Demand &amp; Cost Data Issues Detected:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-red-700 font-mono text-[11px]">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* KPI Metric Tiles */}
      <BusinessImpactSummaryRibbon
        summary={displayedSummary}
        activeRiskFilter={activeRiskFilter}
        onSelectRiskFilter={setActiveRiskFilter}
      />

      {/* Visual Comparison Chart */}
      {rows.length > 0 && <BusinessImpactChart rows={rows} />}

      {/* Main Sortable Data Table */}
      <BusinessImpactTable
        rows={rows}
        filteredRows={filteredRows}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        siteFilter={siteFilter}
        onSiteFilterChange={setSiteFilter}
        onExportExcel={onExportExcel}
        onUploadDemandCostCsv={onUploadDemandCostCsv}
      />
    </div>
  );
};
