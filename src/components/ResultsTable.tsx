import React, { useState, useMemo } from 'react';
import { IATResult } from '../types';

interface ResultsTableProps {
  results: IATResult[];
  filteredResults: IATResult[];
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  statusFilter: 'all' | 'old' | 'new';
  onStatusFilterChange: (status: 'all' | 'old' | 'new') => void;
  siteFilter: string;
  onSiteFilterChange: (site: string) => void;
  regionFilter: string;
  onRegionFilterChange: (region: string) => void;
  onExportExcel: () => void;
  snapshotDateStr: string;
  windowStartDateStr: string;
}

type SortField = 'sku' | 'site' | 'skuDescription' | 'interarrivalTimeDays' | 'goodsReceiptMovementsInWindow' | 'logicUsed';
type SortOrder = 'asc' | 'desc';

export const ResultsTable: React.FC<ResultsTableProps> = ({
  results,
  filteredResults,
  searchTerm,
  onSearchTermChange,
  statusFilter,
  onStatusFilterChange,
  siteFilter,
  onSiteFilterChange,
  regionFilter,
  onRegionFilterChange,
  onExportExcel,
  snapshotDateStr,
  windowStartDateStr,
}) => {
  const [sortField, setSortField] = useState<SortField>('sku');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal detail state
  const [selectedRow, setSelectedRow] = useState<IATResult | null>(null);

  // Extract unique sites and regions for dropdown filters
  const uniqueSites = useMemo(() => {
    const set = new Set<string>();
    results.forEach((r) => set.add(r.site));
    return Array.from(set).sort();
  }, [results]);

  const uniqueRegions = useMemo(() => {
    const set = new Set<string>();
    results.forEach((r) => {
      if (r.regionId && r.regionId !== 'N/A') set.add(r.regionId);
    });
    return Array.from(set).sort();
  }, [results]);

  // Sorting logic
  const sortedResults = useMemo(() => {
    return [...filteredResults].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredResults, sortField, sortOrder]);

  // Pagination slice
  const totalPages = Math.ceil(sortedResults.length / pageSize) || 1;
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedResults.slice(start, start + pageSize);
  }, [sortedResults, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="bg-white rounded border border-slate-200 overflow-hidden text-xs">
      {/* Table Action Bar */}
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

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as 'all' | 'old' | 'new')}
            className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Ages</option>
            <option value="old">Old (&gt; 90 days)</option>
            <option value="new">New (&le; 90 days)</option>
          </select>

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

          {/* Region Filter */}
          {uniqueRegions.length > 0 && (
            <select
              value={regionFilter}
              onChange={(e) => onRegionFilterChange(e.target.value)}
              className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-hidden"
            >
              <option value="all">All Regions ({uniqueRegions.length})</option>
              {uniqueRegions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Results Counter & Actions */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-600 font-mono">
            Showing <strong className="text-slate-900">{filteredResults.length}</strong> of {results.length} rows
          </span>
          <button
            onClick={onExportExcel}
            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded cursor-pointer"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Main Table */}
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
                onClick={() => handleSort('skuDescription')}
                className="py-2 px-3 cursor-pointer hover:bg-slate-200/60 select-none"
              >
                <div className="flex items-center space-x-1">
                  <span>Description</span>
                  {sortField === 'skuDescription' && <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                </div>
              </th>
              <th className="py-2 px-3">Location Type</th>
              <th className="py-2 px-3">Age Status</th>
              <th
                onClick={() => handleSort('goodsReceiptMovementsInWindow')}
                className="py-2 px-3 text-right cursor-pointer hover:bg-slate-200/60 select-none"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Receipts</span>
                  {sortField === 'goodsReceiptMovementsInWindow' && (
                    <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('interarrivalTimeDays')}
                className="py-2 px-3 text-right cursor-pointer hover:bg-slate-200/60 select-none bg-slate-200/40"
              >
                <div className="flex items-center justify-end space-x-1 font-bold text-slate-900">
                  <span>Actual IAT (Days)</span>
                  {sortField === 'interarrivalTimeDays' && (
                    <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('logicUsed')}
                className="py-2 px-3 cursor-pointer hover:bg-slate-200/60 select-none"
              >
                <div className="flex items-center space-x-1">
                  <span>Logic Hierarchy Rule</span>
                  {sortField === 'logicUsed' && <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                </div>
              </th>
              <th className="py-2 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-normal">
            {paginatedResults.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500">
                  No SKU-Site combinations found matching the filter criteria.
                </td>
              </tr>
            ) : (
              paginatedResults.map((row) => (
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
                  <td className="py-1.5 px-3 text-slate-700 max-w-xs truncate" title={row.skuDescription}>
                    {row.skuDescription}
                  </td>
                  <td className="py-1.5 px-3 text-slate-600">
                    {row.siteLocationType || 'N/A'}
                  </td>
                  <td className="py-1.5 px-3">
                    <span
                      className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                        row.isOldSkuSite
                          ? 'bg-slate-100 text-slate-800 border border-slate-300'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {row.isOldSkuSite ? 'Old (>90d)' : 'New (≤90d)'}
                    </span>
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono text-slate-700">
                    {row.goodsReceiptMovementsInWindow}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900 bg-slate-50/50">
                    {row.interarrivalTimeDays.toFixed(2)}
                  </td>
                  <td className="py-1.5 px-3">
                    <span className="text-[11px] text-slate-700">
                      {row.logicUsed}
                    </span>
                  </td>
                  <td className="py-1.5 px-3 text-center">
                    <button
                      onClick={() => setSelectedRow(row)}
                      className="px-2 py-0.5 text-[11px] text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 cursor-pointer"
                    >
                      Audit
                    </button>
                  </td>
                </tr>
              ))
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

      {/* Audit Detail Modal */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded border border-slate-300 shadow-xl max-w-lg w-full p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="font-bold text-slate-900 text-sm">
                IAT Calculation Audit &bull; {selectedRow.sku} @ {selectedRow.site}
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
                <div className="font-medium text-slate-800">{selectedRow.skuDescription}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                <span className="text-slate-500">Site Location Type:</span>
                <div className="font-medium text-slate-800">{selectedRow.siteLocationType || 'N/A'}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                <span className="text-slate-500">Snapshot Lookback:</span>
                <div className="font-mono text-slate-800">{windowStartDateStr} to {snapshotDateStr}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                <span className="text-slate-500">Receipts in Window:</span>
                <div className="font-mono font-bold text-slate-800">{selectedRow.goodsReceiptMovementsInWindow}</div>
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-xs">
              <div className="font-semibold text-slate-800 mb-1">Applied Rule Explanation:</div>
              <div className="text-slate-700">{selectedRow.notes}</div>
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
