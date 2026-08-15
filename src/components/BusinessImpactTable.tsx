import React, { useState, useMemo, useRef } from 'react';
import { BusinessImpactRow } from '../types';

interface BusinessImpactTableProps {
  rows: BusinessImpactRow[];
  filteredRows: BusinessImpactRow[];
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  siteFilter: string;
  onSiteFilterChange: (site: string) => void;
  onExportExcel: () => void;
  onUploadDemandCostCsv: (file: File) => void;
}

type SortField =
  | 'sku'
  | 'site'
  | 'partDescription'
  | 'actualIAT'
  | 'baselineLeadTimeDays'
  | 'dailyDemandUnits'
  | 'unitCostUSD'
  | 'cycleStockActual'
  | 'cycleStockNaive'
  | 'deltaUnits'
  | 'deltaCostUSD'
  | 'riskFlag';

type SortOrder = 'asc' | 'desc';

export const BusinessImpactTable: React.FC<BusinessImpactTableProps> = ({
  rows,
  filteredRows,
  searchTerm,
  onSearchTermChange,
  siteFilter,
  onSiteFilterChange,
  onExportExcel,
  onUploadDemandCostCsv,
}) => {
  const [sortField, setSortField] = useState<SortField>('deltaCostUSD');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedRow, setSelectedRow] = useState<BusinessImpactRow | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract unique sites
  const uniqueSites = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.site));
    return Array.from(set).sort();
  }, [rows]);

  // Sort logic
  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRows, sortField, sortOrder]);

  const totalPages = Math.ceil(sortedRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const formatUSD = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="bg-white rounded border border-slate-200 overflow-hidden text-xs">
      {/* Table Header Controls */}
      <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search SKU, site, description..."
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              className="w-48 sm:w-64 px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-slate-500"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchTermChange('')}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                &times;
              </button>
            )}
          </div>

          {/* Site Filter */}
          <select
            value={siteFilter}
            onChange={(e) => onSiteFilterChange(e.target.value)}
            className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Sites ({uniqueSites.length})</option>
            {uniqueSites.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Direct File Picker Input for Demand & Cost CSV */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onUploadDemandCostCsv(file);
                e.target.value = '';
              }
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 text-xs font-medium text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded cursor-pointer transition-colors"
            title="Upload a new demand_and_cost.csv to recalculate business impact"
          >
            Update Demand &amp; Cost CSV
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-600 font-mono">
            Showing <strong className="text-slate-900">{filteredRows.length}</strong> of {rows.length} rows
          </span>
          <button
            onClick={onExportExcel}
            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded cursor-pointer"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Main 10-Column Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-[11px] font-semibold text-slate-700 border-b border-slate-200">
              <th
                onClick={() => handleSort('sku')}
                className="py-2 px-3 cursor-pointer hover:bg-slate-200/60 select-none"
              >
                <div className="flex items-center space-x-1">
                  <span>SKU</span>
                  {sortField === 'sku' && <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                </div>
              </th>

              <th
                onClick={() => handleSort('site')}
                className="py-2 px-3 cursor-pointer hover:bg-slate-200/60 select-none"
              >
                <div className="flex items-center space-x-1">
                  <span>Site</span>
                  {sortField === 'site' && <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                </div>
              </th>

              <th
                onClick={() => handleSort('partDescription')}
                className="py-2 px-3 cursor-pointer hover:bg-slate-200/60 select-none"
              >
                <div className="flex items-center space-x-1">
                  <span>Description</span>
                  {sortField === 'partDescription' && <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                </div>
              </th>

              <th
                onClick={() => handleSort('actualIAT')}
                className="py-2 px-3 text-right cursor-pointer hover:bg-slate-200/60 select-none"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Actual IAT (d)</span>
                  {sortField === 'actualIAT' && <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                </div>
              </th>

              <th
                onClick={() => handleSort('baselineLeadTimeDays')}
                className="py-2 px-3 text-right cursor-pointer hover:bg-slate-200/60 select-none"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Baseline LT (d)</span>
                  {sortField === 'baselineLeadTimeDays' && (
                    <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  )}
                </div>
              </th>

              <th
                onClick={() => handleSort('cycleStockActual')}
                className="py-2 px-3 text-right cursor-pointer hover:bg-slate-200/60 select-none bg-slate-200/40"
              >
                <div className="flex items-center justify-end space-x-1 font-bold text-slate-900">
                  <span>Cycle Stock Actual</span>
                  {sortField === 'cycleStockActual' && <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                </div>
              </th>

              <th
                onClick={() => handleSort('cycleStockNaive')}
                className="py-2 px-3 text-right cursor-pointer hover:bg-slate-200/60 select-none"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Cycle Stock Naive</span>
                  {sortField === 'cycleStockNaive' && <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                </div>
              </th>

              <th
                onClick={() => handleSort('deltaUnits')}
                className="py-2 px-3 text-right cursor-pointer hover:bg-slate-200/60 select-none"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Delta Units</span>
                  {sortField === 'deltaUnits' && <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                </div>
              </th>

              <th
                onClick={() => handleSort('deltaCostUSD')}
                className="py-2 px-3 text-right cursor-pointer hover:bg-slate-200/60 select-none bg-slate-200/40"
              >
                <div className="flex items-center justify-end space-x-1 font-bold text-slate-900">
                  <span>Delta Cost ($)</span>
                  {sortField === 'deltaCostUSD' && <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                </div>
              </th>

              <th
                onClick={() => handleSort('riskFlag')}
                className="py-2 px-3 cursor-pointer hover:bg-slate-200/60 select-none"
              >
                <div className="flex items-center space-x-1">
                  <span>Risk Flag</span>
                  {sortField === 'riskFlag' && <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                </div>
              </th>

              <th className="py-2 px-3 text-center">Audit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-normal">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-slate-500">
                  No matching SKU-Site records found in demand_and_cost.csv.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => {
                const isUnderstated = row.deltaUnits > 0.001;
                const isOverstated = row.deltaUnits < -0.001;

                return (
                  <tr
                    key={`${row.sku}-${row.site}`}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-1.5 px-3 font-mono font-bold text-slate-900">
                      {row.sku}
                    </td>
                    <td className="py-1.5 px-3 font-mono text-slate-700">
                      {row.site}
                    </td>
                    <td className="py-1.5 px-3 text-slate-700 max-w-xs truncate" title={row.partDescription}>
                      {row.partDescription}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono text-slate-700">
                      {row.actualIAT.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono text-slate-600">
                      {row.baselineLeadTimeDays}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-semibold text-slate-900 bg-slate-50/50">
                      {row.cycleStockActual.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono text-slate-600">
                      {row.cycleStockNaive.toFixed(2)}
                    </td>
                    <td
                      className={`py-1.5 px-3 text-right font-mono font-semibold ${
                        isUnderstated
                          ? 'text-red-700'
                          : isOverstated
                          ? 'text-amber-800'
                          : 'text-slate-700'
                      }`}
                    >
                      {row.deltaUnits > 0 ? '+' : ''}
                      {row.deltaUnits.toFixed(2)}
                    </td>
                    <td
                      className={`py-1.5 px-3 text-right font-mono font-bold bg-slate-50/50 ${
                        isUnderstated
                          ? 'text-red-700'
                          : isOverstated
                          ? 'text-amber-800'
                          : 'text-slate-900'
                      }`}
                    >
                      {row.deltaCostUSD > 0 ? '+' : ''}
                      {formatUSD(row.deltaCostUSD)}
                    </td>
                    <td className="py-1.5 px-3">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isUnderstated
                              ? 'bg-red-600'
                              : isOverstated
                              ? 'bg-amber-600'
                              : 'bg-emerald-600'
                          }`}
                        />
                        <span
                          className={`text-[11px] font-medium ${
                            isUnderstated
                              ? 'text-red-700'
                              : isOverstated
                              ? 'text-amber-800'
                              : 'text-emerald-700'
                          }`}
                        >
                          {row.riskFlag}
                        </span>
                      </div>
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      <button
                        onClick={() => setSelectedRow(row)}
                        className="px-2 py-0.5 text-[11px] text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 cursor-pointer"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-2 text-slate-600 text-xs">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-0.5 bg-white border border-slate-300 rounded text-xs text-slate-700"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="text-slate-400">|</span>
          <span>
            Page {currentPage} of {totalPages}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>

      {/* Row Detail Audit Modal */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded border border-slate-300 shadow-xl max-w-lg w-full p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="font-bold text-slate-900 text-sm">
                Working Capital Drilldown &bull; {selectedRow.sku} @ {selectedRow.site}
              </h3>
              <button
                onClick={() => setSelectedRow(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                <span className="text-slate-500">Part Description:</span>
                <div className="font-medium text-slate-800">{selectedRow.partDescription}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                <span className="text-slate-500">Unit Cost (USD):</span>
                <div className="font-mono font-bold text-slate-800">${selectedRow.unitCostUSD.toFixed(2)}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                <span className="text-slate-500">Daily Demand (Units):</span>
                <div className="font-mono text-slate-800">{selectedRow.dailyDemandUnits} units/day</div>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                <span className="text-slate-500">Baseline Lead Time:</span>
                <div className="font-mono text-slate-800">{selectedRow.baselineLeadTimeDays} days</div>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                <span className="text-slate-500">Actual Computed IAT:</span>
                <div className="font-mono font-bold text-slate-800">{selectedRow.actualIAT.toFixed(2)} days</div>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                <span className="text-slate-500">IAT Logic Source:</span>
                <div className="text-slate-800">{selectedRow.logicRuleType || 'Calculated'}</div>
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-xs space-y-1">
              <div className="font-semibold text-slate-800">Mathematical Breakdown:</div>
              <div className="font-mono text-[11px] text-slate-700">
                &bull; Cycle Stock (Actual) = {selectedRow.dailyDemandUnits} &times; {selectedRow.actualIAT.toFixed(2)} / 2 = <strong>{selectedRow.cycleStockActual.toFixed(2)} units</strong>
              </div>
              <div className="font-mono text-[11px] text-slate-700">
                &bull; Cycle Stock (Naive) = {selectedRow.dailyDemandUnits} &times; {selectedRow.baselineLeadTimeDays} / 2 = <strong>{selectedRow.cycleStockNaive.toFixed(2)} units</strong>
              </div>
              <div className="font-mono text-[11px] text-slate-700">
                &bull; Delta Units = {selectedRow.cycleStockActual.toFixed(2)} - {selectedRow.cycleStockNaive.toFixed(2)} = <strong>{selectedRow.deltaUnits > 0 ? '+' : ''}{selectedRow.deltaUnits.toFixed(2)} units</strong>
              </div>
              <div className="font-mono text-[11px] text-slate-700">
                &bull; Delta Cost = {selectedRow.deltaUnits.toFixed(2)} &times; ${selectedRow.unitCostUSD.toFixed(2)} = <strong>{selectedRow.deltaCostUSD > 0 ? '+' : ''}{formatUSD(selectedRow.deltaCostUSD)}</strong>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setSelectedRow(null)}
                className="px-3 py-1 bg-slate-900 text-white rounded text-xs hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
