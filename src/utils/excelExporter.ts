import * as XLSX from 'xlsx';
import { IATResult, IATSummary, BusinessImpactRow, BusinessImpactSummary } from '../types';

export interface ExportExcelOptions {
  results: IATResult[];
  summary: IATSummary;
  businessImpactRows?: BusinessImpactRow[];
  businessImpactSummary?: BusinessImpactSummary;
  snapshotDateStr: string;
  windowStartDateStr: string;
  filename?: string;
}

export function exportToExcel(options: ExportExcelOptions): void {
  const {
    results,
    summary,
    businessImpactRows = [],
    businessImpactSummary,
    snapshotDateStr,
    windowStartDateStr,
    filename = 'Supply_Chain_Analytics_Export.xlsx',
  } = options;

  const workbook = XLSX.utils.book_new();

  // 1. Sheet 1: Business Impact & Cycle Stock (if available)
  if (businessImpactRows.length > 0) {
    const businessImpactData = businessImpactRows.map((r) => ({
      'SKU': r.sku,
      'Site': r.site,
      'Description': r.partDescription,
      'Actual IAT (Days)': Number(r.actualIAT.toFixed(2)),
      'Baseline Lead Time (Days)': r.baselineLeadTimeDays,
      'Daily Demand (Units/Day)': r.dailyDemandUnits,
      'Unit Cost (USD)': Number(r.unitCostUSD.toFixed(2)),
      'Cycle Stock Actual (Units)': Number(r.cycleStockActual.toFixed(2)),
      'Cycle Stock Naive (Units)': Number(r.cycleStockNaive.toFixed(2)),
      'Delta Units': Number(r.deltaUnits.toFixed(2)),
      'Delta Cost (USD)': Number(r.deltaCostUSD.toFixed(2)),
      'Risk Flag': r.riskFlag,
    }));

    const biWorksheet = XLSX.utils.json_to_sheet(businessImpactData);
    biWorksheet['!cols'] = [
      { wch: 12 }, // SKU
      { wch: 15 }, // Site
      { wch: 32 }, // Description
      { wch: 18 }, // Actual IAT
      { wch: 22 }, // Baseline LT
      { wch: 22 }, // Daily Demand
      { wch: 16 }, // Unit Cost
      { wch: 24 }, // CS Actual
      { wch: 24 }, // CS Naive
      { wch: 16 }, // Delta Units
      { wch: 18 }, // Delta Cost
      { wch: 38 }, // Risk Flag
    ];
    XLSX.utils.book_append_sheet(workbook, biWorksheet, 'Business Impact & Cycle Stock');
  }

  // 2. Sheet 2: IAT Calculation Results
  const resultsData = results.map((r) => ({
    'SKU': r.sku,
    'Site': r.site,
    'SKU Description': r.skuDescription,
    'Site Description': r.siteDescription,
    'Interarrival Time (Days)': Number(r.interarrivalTimeDays.toFixed(2)),
    'Logic Used': r.logicUsed,
    'SKU-Site Status': r.isOld ? 'OLD (Has Movements)' : 'NEW (No Movements)',
    'Site Location Type': r.siteLocationType,
    'Region': r.regionId,
    'GTIN': r.gtin,
    'Segment': r.segment,
    'Category': r.category,
    'Division': r.division,
    'Goods Receipts Count': r.goodsReceiptMovementsInWindow,
    'Total Movements in Window': r.totalMovementsInWindow,
    'Distinct Period Count': r.distinctPeriodCount,
    'Period Type': r.periodType,
  }));

  const resultsWorksheet = XLSX.utils.json_to_sheet(resultsData);
  resultsWorksheet['!cols'] = [
    { wch: 12 }, // SKU
    { wch: 15 }, // Site
    { wch: 30 }, // SKU Description
    { wch: 25 }, // Site Description
    { wch: 24 }, // IAT
    { wch: 45 }, // Logic Used
    { wch: 22 }, // Status
    { wch: 18 }, // Location Type
    { wch: 12 }, // Region
    { wch: 12 }, // GTIN
    { wch: 15 }, // Segment
    { wch: 15 }, // Category
    { wch: 15 }, // Division
    { wch: 20 }, // Goods Receipts
    { wch: 22 }, // Total Movements
    { wch: 20 }, // Distinct Period
    { wch: 14 }, // Period Type
  ];

  XLSX.utils.book_append_sheet(workbook, resultsWorksheet, 'IAT Results');

  // 3. Sheet 3: Executive Summary & KPIs
  const summaryData = [
    { Parameter: 'Snapshot Date', Value: snapshotDateStr },
    { Parameter: 'Lookback Window Start (182 days prior)', Value: windowStartDateStr },
    { Parameter: 'Total SKU-Site Combinations Evaluated', Value: summary.totalSkuSites },
    { Parameter: 'OLD SKU-Sites (Active Movements)', Value: summary.oldSkuSitesCount },
    { Parameter: 'NEW SKU-Sites (No Movements)', Value: summary.newSkuSitesCount },
    { Parameter: '', Value: '' },
    { Parameter: '--- RULE BREAKDOWN ---', Value: '' },
    { Parameter: 'Direct Calculation - Hub DC (ISO Weeks)', Value: summary.directHubCount },
    { Parameter: 'Direct Calculation - Spoke DC (Calendar Days)', Value: summary.directSpokeCount },
    { Parameter: 'GTIN Substitution (Rule 5a)', Value: summary.gtinSubCount },
    { Parameter: 'Hierarchy / Segment Substitution (Rule 5b)', Value: summary.segmentSubCount },
    { Parameter: 'Default Fallback - 182 days (Rule 5c)', Value: summary.defaultCount },
  ];

  if (businessImpactSummary) {
    summaryData.push(
      { Parameter: '', Value: '' },
      { Parameter: '--- BUSINESS IMPACT & CYCLE STOCK ---', Value: '' },
      { Parameter: 'Total $ Understated (Stockout Risk)', Value: Number(businessImpactSummary.totalUnderstatedCost.toFixed(2)) },
      { Parameter: 'Total $ Overstated (Excess Carrying Cost)', Value: Number(businessImpactSummary.totalOverstatedCost.toFixed(2)) },
      { Parameter: 'Net Working Capital Delta (USD)', Value: Number(businessImpactSummary.netImpactCost.toFixed(2)) },
      { Parameter: 'Stockout Risk Count', Value: businessImpactSummary.stockoutRiskCount },
      { Parameter: 'Excess Carrying Cost Count', Value: businessImpactSummary.excessCarryingCostCount },
      { Parameter: 'No Gap Count', Value: businessImpactSummary.noGapCount }
    );
  }

  const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
  summaryWorksheet['!cols'] = [{ wch: 45 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Executive Summary');

  // Trigger download
  XLSX.writeFile(workbook, filename);
}
