import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { BusinessImpactRow } from '../types';

interface BusinessImpactChartProps {
  rows: BusinessImpactRow[];
}

export const BusinessImpactChart: React.FC<BusinessImpactChartProps> = ({ rows }) => {
  const [metricMode, setMetricMode] = useState<'units' | 'cost'>('cost');

  const chartData = rows.map((r) => {
    const actualValue = metricMode === 'units' ? r.cycleStockActual : r.cycleStockActual * r.unitCostUSD;
    const naiveValue = metricMode === 'units' ? r.cycleStockNaive : r.cycleStockNaive * r.unitCostUSD;

    return {
      name: `${r.sku} (${r.site.split('_')[0]})`,
      sku: r.sku,
      site: r.site,
      description: r.partDescription,
      actualIAT: r.actualIAT,
      baselineLeadTime: r.baselineLeadTimeDays,
      dailyDemand: r.dailyDemandUnits,
      unitCost: r.unitCostUSD,
      cycleStockActual: r.cycleStockActual,
      cycleStockNaive: r.cycleStockNaive,
      deltaUnits: r.deltaUnits,
      deltaCost: r.deltaCostUSD,
      riskFlag: r.riskFlag,
      actualVal: Number(actualValue.toFixed(2)),
      naiveVal: Number(naiveValue.toFixed(2)),
    };
  });

  const formatTooltipCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(val);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2.5 rounded border border-slate-300 shadow-md text-xs space-y-1 z-50">
          <div className="font-bold text-slate-900 border-b border-slate-200 pb-1">
            {data.sku} &bull; {data.site}
          </div>
          <div className="text-slate-600 text-[11px] truncate max-w-xs">
            {data.description}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 pt-1 text-[11px]">
            <span className="text-slate-500">Actual IAT:</span>
            <span className="font-mono text-slate-900 font-semibold">{data.actualIAT.toFixed(2)} days</span>

            <span className="text-slate-500">Baseline Lead Time:</span>
            <span className="font-mono text-slate-900">{data.baselineLeadTime} days</span>

            <span className="text-slate-500">Daily Demand:</span>
            <span className="font-mono text-slate-900">{data.dailyDemand} units/day</span>

            <span className="text-slate-500">Unit Cost:</span>
            <span className="font-mono text-slate-900">${data.unitCost.toFixed(2)}</span>

            <span className="text-slate-500">Delta Units:</span>
            <span
              className={`font-mono font-semibold ${
                data.deltaUnits > 0 ? 'text-red-700' : data.deltaUnits < 0 ? 'text-amber-800' : 'text-slate-900'
              }`}
            >
              {data.deltaUnits > 0 ? '+' : ''}
              {data.deltaUnits.toFixed(2)} units
            </span>

            <span className="text-slate-500">Delta Cost:</span>
            <span
              className={`font-mono font-bold ${
                data.deltaCost > 0 ? 'text-red-700' : data.deltaCost < 0 ? 'text-amber-800' : 'text-slate-900'
              }`}
            >
              {data.deltaCost > 0 ? '+' : ''}
              {formatTooltipCurrency(data.deltaCost)}
            </span>
          </div>
          <div className="pt-1 border-t border-slate-100 flex items-center space-x-1.5 text-[10px] font-semibold">
            <span
              className={`w-2 h-2 rounded-full ${
                data.deltaUnits > 0 ? 'bg-red-600' : data.deltaUnits < 0 ? 'bg-amber-600' : 'bg-emerald-600'
              }`}
            />
            <span
              className={
                data.deltaUnits > 0 ? 'text-red-700' : data.deltaUnits < 0 ? 'text-amber-800' : 'text-emerald-700'
              }
            >
              {data.riskFlag}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded border border-slate-200 p-3 text-xs">
      {/* Chart Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
        <div>
          <h3 className="text-xs font-bold text-slate-900">
            Cycle Stock Variance Analysis (Actual IAT vs. Naive Baseline)
          </h3>
          <p className="text-[11px] text-slate-500">
            Compares calculated inventory requirements against baseline assumptions per SKU-Site
          </p>
        </div>

        {/* Units vs Cost Toggle */}
        <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded border border-slate-200">
          <button
            onClick={() => setMetricMode('cost')}
            className={`px-2.5 py-0.5 text-xs rounded transition-colors cursor-pointer ${
              metricMode === 'cost'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dollar Value ($)
          </button>
          <button
            onClick={() => setMetricMode('units')}
            className={`px-2.5 py-0.5 text-xs rounded transition-colors cursor-pointer ${
              metricMode === 'units'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Units
          </button>
        </div>
      </div>

      {/* Bar Chart Container */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              interval={0}
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tickFormatter={(v) => (metricMode === 'cost' ? `$${v.toLocaleString()}` : v.toLocaleString())}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              formatter={(value) => (
                <span className="text-slate-700 font-medium">
                  {value === 'actualVal'
                    ? `Actual Cycle Stock (${metricMode === 'cost' ? '$' : 'Units'})`
                    : `Naive Baseline Cycle Stock (${metricMode === 'cost' ? '$' : 'Units'})`}
                </span>
              )}
            />
            <Bar
              dataKey="actualVal"
              name="actualVal"
              fill="#0f172a"
              radius={[2, 2, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              dataKey="naiveVal"
              name="naiveVal"
              fill="#94a3b8"
              radius={[2, 2, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
