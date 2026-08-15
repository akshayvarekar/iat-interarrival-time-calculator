import React from 'react';

interface LogicHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogicHelpModal: React.FC<LogicHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded border border-slate-300 shadow-xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wide">
            Interarrival Time (IAT) &amp; Cycle Stock Logic Guide
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-2 py-0.5 text-base leading-none cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 max-h-[80vh] overflow-y-auto text-xs text-slate-700">
          {/* Rule 1 */}
          <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
            <div className="font-bold text-slate-900 mb-0.5">
              1. 182-Day Lookback Window
            </div>
            <p className="text-slate-600">
              Evaluates transactions in <code className="bg-slate-200 px-1 py-0.2 rounded font-mono">movement_data.csv</code> occurring within 182 days prior to Snapshot Date: <code className="bg-slate-200 px-1 py-0.2 rounded font-mono">[SnapshotDate - 182d, SnapshotDate]</code>.
            </p>
          </div>

          {/* Rule 2 */}
          <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
            <div className="font-bold text-slate-900 mb-0.5">
              2. Goods Receipt Filter
            </div>
            <p className="text-slate-600">
              A transaction is counted as a Goods Receipt if its MovementType is marked as <code className="font-mono font-bold text-slate-900">IsGoodsReceipt = Y</code> for that region in <code className="bg-slate-200 px-1 py-0.2 rounded font-mono">movement_type_reference.csv</code>.
            </p>
          </div>

          {/* Rule 3 & 4 */}
          <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
            <div className="font-bold text-slate-900 mb-0.5">
              3. Direct IAT Calculation (OLD SKU-Sites)
            </div>
            <p className="text-slate-600 mb-1">
              If a SKU-Site has 1 or more goods receipts in the 182-day window:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-700 pl-2">
              <li>
                <strong>Hub DC:</strong> Distinct ISO weeks. Formula: <code className="font-mono font-bold bg-white px-1 py-0.2 rounded border border-slate-200">IAT = 182 / count_distinct_ISO_weeks</code>
              </li>
              <li>
                <strong>Spoke DC:</strong> Distinct calendar days. Formula: <code className="font-mono font-bold bg-white px-1 py-0.2 rounded border border-slate-200">IAT = 182 / count_distinct_days</code>
              </li>
            </ul>
          </div>

          {/* Rule 5 */}
          <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
            <div className="font-bold text-slate-900 mb-0.5">
              4. Substitution Cascade (NEW SKU-Sites)
            </div>
            <p className="text-slate-600 mb-1">
              If a SKU-Site has 0 goods receipts in the window:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-2">
              <li>
                <strong>Rule 5a (GTIN Sub):</strong> Matches other SKUs with the same GTIN having direct calculated IAT at the same site.
              </li>
              <li>
                <strong>Rule 5b (Segment Sub):</strong> Matches other SKUs with the same Segment having direct calculated IAT at the same site.
              </li>
              <li>
                <strong>Rule 5c (Default Fallback):</strong> Defaults to 182 days.
              </li>
            </ol>
          </div>

          {/* Business Impact Formulas */}
          <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
            <div className="font-bold text-slate-900 mb-0.5">
              5. Business Impact &amp; Working Capital Formulas
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-700 pl-2 font-mono text-[11px]">
              <li>Cycle Stock (Actual) = DailyDemandUnits &times; Actual IAT / 2</li>
              <li>Cycle Stock (Naive) = DailyDemandUnits &times; BaselineLeadTimeDays / 2</li>
              <li>Delta Units = Cycle Stock (Actual) - Cycle Stock (Naive)</li>
              <li>Delta Cost ($) = Delta Units &times; UnitCostUSD</li>
              <li>Risk: Understated (Delta &gt; 0, Stockout Risk), Overstated (Delta &lt; 0, Excess Carrying), No Gap (Delta = 0)</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-slate-100 border-t border-slate-200 text-right">
          <button
            onClick={onClose}
            className="px-3.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
