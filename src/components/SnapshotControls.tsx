import React from 'react';

interface SnapshotControlsProps {
  snapshotDate: string;
  onSnapshotDateChange: (date: string) => void;
  windowStartDateStr: string;
  onCalculate: () => void;
  isCalculating: boolean;
}

export const SnapshotControls: React.FC<SnapshotControlsProps> = ({
  snapshotDate,
  onSnapshotDateChange,
  windowStartDateStr,
  onCalculate,
  isCalculating,
}) => {
  return (
    <div className="bg-white rounded border border-slate-200 p-2.5 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Date Selector & Lookback Display */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-xs font-semibold text-slate-700">
              Snapshot Date:
            </label>
            <input
              type="date"
              value={snapshotDate}
              onChange={(e) => onSnapshotDateChange(e.target.value)}
              className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-medium text-slate-900 focus:outline-hidden focus:border-slate-500"
            />
          </div>

          <div className="text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-200 font-mono">
            <span className="text-slate-500 font-sans font-medium mr-1.5">182-Day Lookback:</span>
            <span>{windowStartDateStr || '2026-02-09'}</span>
            <span className="text-slate-400 mx-1.5">to</span>
            <span>{snapshotDate}</span>
          </div>
        </div>

        {/* Recalculate Button */}
        <div className="flex items-center">
          <button
            onClick={onCalculate}
            disabled={isCalculating}
            className="px-3.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded transition-colors cursor-pointer disabled:opacity-50"
          >
            {isCalculating ? 'Recalculating...' : 'Recalculate IAT'}
          </button>
        </div>
      </div>
    </div>
  );
};
