import React from 'react';

interface HeaderProps {
  onLoadSampleData: () => void;
  onExportExcel: () => void;
  onReset: () => void;
  onToggleHelp: () => void;
  hasResults: boolean;
  isCalculating: boolean;
  activeTab: 'iat' | 'business_impact';
  onTabChange: (tab: 'iat' | 'business_impact') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onLoadSampleData,
  onExportExcel,
  onReset,
  onToggleHelp,
  hasResults,
  isCalculating,
  activeTab,
  onTabChange,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-30">
      <div className="max-w-[1600px] mx-auto px-4 h-11 flex items-center justify-between gap-4">
        {/* Title & Navigation */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
              Supply Chain Analytics
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-xs font-bold text-white">
              IAT &amp; Working Capital Impact
            </span>
          </div>

          {/* Tab Navigation */}
          <nav className="flex space-x-1 border-l border-slate-800 pl-4">
            <button
              onClick={() => onTabChange('iat')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                activeTab === 'iat'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              IAT Results
            </button>
            <button
              onClick={() => onTabChange('business_impact')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                activeTab === 'business_impact'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Business Impact &amp; Cycle Stock
            </button>
          </nav>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onLoadSampleData}
            disabled={isCalculating}
            className="px-2.5 py-1 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors cursor-pointer disabled:opacity-50"
            title="Load standard reference benchmark datasets"
          >
            Load Sample CSVs
          </button>

          <button
            onClick={onToggleHelp}
            className="px-2.5 py-1 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors cursor-pointer"
          >
            Logic Guide
          </button>

          <button
            onClick={onReset}
            className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-700 border border-slate-700/60 rounded transition-colors cursor-pointer"
          >
            Reset
          </button>

          <button
            onClick={onExportExcel}
            disabled={!hasResults || isCalculating}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              hasResults && !isCalculating
                ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
                : 'bg-slate-800 text-slate-600 border border-slate-800 cursor-not-allowed'
            }`}
          >
            Export CSV
          </button>
        </div>
      </div>
    </header>
  );
};
