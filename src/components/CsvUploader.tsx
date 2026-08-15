import React, { useRef } from 'react';
import { CsvValidationStatus, CsvFileKey } from '../types';

interface CsvUploaderProps {
  statuses: Record<string, CsvValidationStatus>;
  onFileUpload: (fileKey: string, file: File) => void;
  onPreviewCsv: (fileKey: string) => void;
  onDownloadSampleCsv: (fileKey: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const FILE_CONFIGS: Array<{
  key: CsvFileKey;
  label: string;
  filename: string;
  reqCols: string[];
  description: string;
}> = [
  {
    key: 'site_master',
    label: 'Site Master',
    filename: 'site_master.csv',
    reqCols: ['Site', 'SiteLocationType'],
    description: 'Site details, Location Type (Hub DC/Spoke DC) and Region',
  },
  {
    key: 'sku_master',
    label: 'SKU Master',
    filename: 'sku_master.csv',
    reqCols: ['SKU', 'GTIN', 'Segment'],
    description: 'SKU hierarchy, GTIN barcodes, and Segment info',
  },
  {
    key: 'movement_type_reference',
    label: 'Movement Type Reference',
    filename: 'movement_type_reference.csv',
    reqCols: ['RegionId', 'MovementType', 'IsGoodsReceipt'],
    description: 'Defines Goods Receipt flag (Y/N) per region & type',
  },
  {
    key: 'movement_data',
    label: 'Movement Data',
    filename: 'movement_data.csv',
    reqCols: ['MaterialNumber', 'PlantCode', 'MovementType', 'PostingDate'],
    description: 'Historical inventory postings and transaction log',
  },
  {
    key: 'demand_and_cost',
    label: 'Demand & Cost',
    filename: 'demand_and_cost.csv',
    reqCols: ['SKU', 'Site', 'DailyDemandUnits', 'UnitCostUSD', 'BaselineLeadTimeDays'],
    description: 'Daily demand, unit cost, and baseline lead time for Business Impact',
  },
];

export const CsvUploader: React.FC<CsvUploaderProps> = ({
  statuses,
  onFileUpload,
  onPreviewCsv,
  onDownloadSampleCsv,
  isExpanded,
  onToggleExpand,
}) => {
  const fileInputRefs: Record<string, React.RefObject<HTMLInputElement | null>> = {
    site_master: useRef<HTMLInputElement>(null),
    sku_master: useRef<HTMLInputElement>(null),
    movement_type_reference: useRef<HTMLInputElement>(null),
    movement_data: useRef<HTMLInputElement>(null),
    demand_and_cost: useRef<HTMLInputElement>(null),
  };

  const allValid = Object.values(statuses).every((s: CsvValidationStatus) => s.isValid && s.rowCount > 0);

  return (
    <div className="bg-white rounded border border-slate-200 overflow-hidden text-xs">
      {/* Header Bar */}
      <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold text-slate-900">
            Source Data Management ({FILE_CONFIGS.length} Datasets)
          </h2>
          <p className="text-[11px] text-slate-500">
            Active schema tables powering IAT and Business Impact calculations
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {allValid ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5" />
              All Datasets Loaded
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mr-1.5" />
              Dataset Action Needed
            </span>
          )}

          <button
            onClick={onToggleExpand}
            className="text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 px-2 py-0.5 rounded cursor-pointer transition-colors"
          >
            {isExpanded ? 'Collapse' : 'Manage Files'}
          </button>
        </div>
      </div>

      {/* Expanded Grid */}
      {isExpanded && (
        <div className="p-3 bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
            {FILE_CONFIGS.map((cfg) => {
              const status = statuses[cfg.key] || {
                filename: cfg.filename,
                isValid: false,
                rowCount: 0,
                errors: [],
                warnings: [],
              };

              return (
                <div
                  key={cfg.key}
                  className="bg-white rounded border border-slate-200 p-2.5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs truncate">
                        {cfg.label}
                      </span>
                      {status.isValid && status.rowCount > 0 ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-600" title="Valid" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-red-600" title="Invalid/Empty" />
                      )}
                    </div>

                    <div className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                      {status.filename}
                    </div>

                    <div className="mt-2 py-1 px-2 bg-slate-50 rounded border border-slate-100 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-500 font-sans">Rows:</span>
                      <span className="font-bold text-slate-800">{status.rowCount}</span>
                    </div>

                    <p className="text-[10px] text-slate-500 mt-1.5 line-clamp-2">
                      {cfg.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px]">
                    <button
                      onClick={() => onPreviewCsv(cfg.key)}
                      className="px-2 py-0.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                    >
                      Preview
                    </button>

                    <button
                      onClick={() => onDownloadSampleCsv(cfg.key)}
                      className="px-2 py-0.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                    >
                      Template
                    </button>

                    <input
                      type="file"
                      ref={fileInputRefs[cfg.key]}
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          onFileUpload(cfg.key, file);
                          e.target.value = '';
                        }
                      }}
                    />
                    <button
                      onClick={() => fileInputRefs[cfg.key].current?.click()}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded border border-slate-300 cursor-pointer"
                    >
                      Upload
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
