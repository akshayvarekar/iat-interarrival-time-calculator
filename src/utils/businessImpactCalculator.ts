import { BusinessImpactRow, BusinessImpactSummary, DemandAndCost, IATResult } from '../types';

export interface BusinessImpactCalculationResult {
  rows: BusinessImpactRow[];
  summary: BusinessImpactSummary;
  errors: string[];
}

export function calculateBusinessImpact(
  demandData: DemandAndCost[],
  iatResults: IATResult[]
): BusinessImpactCalculationResult {
  const errors: string[] = [];

  if (!demandData || demandData.length === 0) {
    return {
      rows: [],
      summary: {
        totalCount: 0,
        totalUnderstatedCost: 0,
        totalOverstatedCost: 0,
        netImpactCost: 0,
        stockoutRiskCount: 0,
        excessCarryingCostCount: 0,
        noGapCount: 0,
      },
      errors: ['No demand_and_cost.csv data provided. Please upload or load demand and cost records.'],
    };
  }

  // Create lookup map for pre-calculated IAT results keyed by "SKU|SITE"
  const iatMap = new Map<string, IATResult>();
  iatResults.forEach((res) => {
    const key = `${(res.sku || '').trim().toUpperCase()}|${(res.site || '').trim().toUpperCase()}`;
    iatMap.set(key, res);
  });

  const rows: BusinessImpactRow[] = [];

  demandData.forEach((item, index) => {
    const sku = (item.SKU || '').trim();
    const site = (item.Site || '').trim();

    if (!sku || !site) {
      errors.push(`Row ${index + 1}: Missing SKU or Site identifier.`);
      return;
    }

    const key = `${sku.toUpperCase()}|${site.toUpperCase()}`;
    const matchedIat = iatMap.get(key);

    // If there is no computed IAT result for this SKU-Site, we note it or fallback to default 182d
    const actualIAT = matchedIat !== undefined ? matchedIat.interarrivalTimeDays : 182;
    const partDescription = item.PartDescription || matchedIat?.skuDescription || 'N/A';
    const siteLocationType = matchedIat?.siteLocationType;
    const regionId = matchedIat?.regionId;
    const logicRuleType = matchedIat?.logicRuleType;

    // Strict numerical parsing from the literal file contents
    const rawDemand = String(item.DailyDemandUnits ?? '').trim();
    const rawCost = String(item.UnitCostUSD ?? '').trim();
    const rawLeadTime = String(item.BaselineLeadTimeDays ?? '').trim();

    const dailyDemandUnits = Number(rawDemand);
    const unitCostUSD = Number(rawCost);
    const baselineLeadTimeDays = Number(rawLeadTime);

    if (isNaN(dailyDemandUnits) || isNaN(unitCostUSD) || isNaN(baselineLeadTimeDays)) {
      errors.push(
        `Row ${index + 1} (${sku} @ ${site}): Invalid numeric values for Demand (${rawDemand}), Cost (${rawCost}), or Baseline Lead Time (${rawLeadTime}).`
      );
      return;
    }

    // Formulas:
    // Cycle Stock (Actual) = DailyDemandUnits * Actual IAT / 2
    // Cycle Stock (Naive) = DailyDemandUnits * BaselineLeadTimeDays / 2
    // Delta Units = Cycle Stock (Actual) - Cycle Stock (Naive)
    // Delta Cost (USD) = Delta Units * UnitCostUSD
    const cycleStockActual = (dailyDemandUnits * actualIAT) / 2;
    const cycleStockNaive = (dailyDemandUnits * baselineLeadTimeDays) / 2;
    const deltaUnits = cycleStockActual - cycleStockNaive;
    const deltaCostUSD = deltaUnits * unitCostUSD;

    // Risk classification:
    // If Delta Units > 0 => Actual buffer required is larger than Naive buffer => Understated buffer (Stockout risk)
    // If Delta Units < 0 => Actual buffer required is smaller than Naive buffer => Overstated buffer (Excess carrying cost)
    // If Delta Units == 0 => No gap
    let riskFlag: BusinessImpactRow['riskFlag'] = 'No gap';
    if (deltaUnits > 0.001) {
      riskFlag = 'Understated buffer - stockout risk';
    } else if (deltaUnits < -0.001) {
      riskFlag = 'Overstated buffer - excess carrying cost';
    } else {
      riskFlag = 'No gap';
    }

    rows.push({
      sku,
      site,
      partDescription,
      actualIAT,
      baselineLeadTimeDays,
      dailyDemandUnits,
      unitCostUSD,
      cycleStockActual,
      cycleStockNaive,
      deltaUnits,
      deltaCostUSD,
      riskFlag,
      siteLocationType,
      regionId,
      logicRuleType,
    });
  });

  const summary = calculateBusinessImpactSummary(rows);

  return {
    rows,
    summary,
    errors,
  };
}

export function calculateBusinessImpactSummary(rows: BusinessImpactRow[]): BusinessImpactSummary {
  let totalUnderstatedCost = 0;
  let totalOverstatedCost = 0;
  let netImpactCost = 0;
  let stockoutRiskCount = 0;
  let excessCarryingCostCount = 0;
  let noGapCount = 0;

  rows.forEach((r) => {
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
    totalCount: rows.length,
    totalUnderstatedCost,
    totalOverstatedCost,
    netImpactCost,
    stockoutRiskCount,
    excessCarryingCostCount,
    noGapCount,
  };
}
