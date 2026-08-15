import {
  CalculationInput,
  calculateIAT,
} from '../utils/iatCalculator';
import { getLookbackWindow, isDateInWindow, parseDate } from '../utils/dateUtils';
import { IATResult } from '../types';

export function toolExplainSkuSite(
  args: { sku?: string; site?: string },
  context: CalculationInput
) {
  const { siteMaster, skuMaster, movementTypeRef, movementData, snapshotDateStr } = context;
  const currentCalc = calculateIAT(context);
  const results = currentCalc.results;

  let reqSku = (args.sku || '').trim().toUpperCase();
  let reqSite = (args.site || '').trim().toUpperCase();

  // 1. Exact Match
  let item = results.find(
    (r) => r.sku.toUpperCase() === reqSku && r.site.toUpperCase() === reqSite
  );

  // 2. Fuzzy match if exact match not found
  if (!item) {
    const rawSkuQuery = (args.sku || '').trim().toLowerCase();
    const rawSiteQuery = (args.site || '').trim().toLowerCase();

    const matchedSkus = skuMaster.filter(
      (s) =>
        s.SKU.toLowerCase() === rawSkuQuery ||
        s.SKU.toLowerCase().includes(rawSkuQuery) ||
        (s.PartDescription || '').toLowerCase().includes(rawSkuQuery)
    );

    const matchedSites = siteMaster.filter(
      (s) =>
        s.Site.toLowerCase() === rawSiteQuery ||
        s.Site.toLowerCase().includes(rawSiteQuery) ||
        (s.PlantName || '').toLowerCase().includes(rawSiteQuery)
    );

    if (matchedSkus.length === 1 && matchedSites.length === 1) {
      reqSku = matchedSkus[0].SKU.toUpperCase();
      reqSite = matchedSites[0].Site.toUpperCase();
      item = results.find(
        (r) => r.sku.toUpperCase() === reqSku && r.site.toUpperCase() === reqSite
      );
    } else if (matchedSkus.length > 0 || matchedSites.length > 0) {
      const candidates = results.filter((r) => {
        const skuMatch = matchedSkus.some((s) => s.SKU.toUpperCase() === r.sku.toUpperCase());
        const siteMatch = matchedSites.some((s) => s.Site.toUpperCase() === r.site.toUpperCase());
        return (matchedSkus.length > 0 && skuMatch) && (matchedSites.length > 0 && siteMatch);
      });

      if (candidates.length === 1) {
        item = candidates[0];
      } else if (candidates.length > 1) {
        return {
          status: 'ambiguous',
          message: `Multiple candidate SKU-Site pairs matched. Please clarify: ${candidates
            .slice(0, 5)
            .map((c) => `${c.sku} at ${c.site} (${c.skuDescription})`)
            .join('; ')}`,
        };
      }
    }
  }

  if (!item) {
    return {
      status: 'not_found',
      message: `Could not resolve SKU '${args.sku}' and Site '${args.site}'. Please clarify the SKU and Site names.`,
    };
  }

  // Qualifying dates calculation
  const { windowStartDate, snapshotDate } = getLookbackWindow(snapshotDateStr, 182);

  const goodsReceiptSet = new Set<string>();
  const fallbackGoodsReceiptSet = new Set<string>();
  movementTypeRef.forEach((ref) => {
    const isGR = (ref.IsGoodsReceipt || '').trim().toUpperCase() === 'Y';
    if (isGR) {
      goodsReceiptSet.add(`${(ref.RegionId || '').trim().toUpperCase()}|${(ref.MovementType || '').trim()}`);
      fallbackGoodsReceiptSet.add((ref.MovementType || '').trim());
    }
  });

  const qualifyingDates: string[] = [];
  movementData.forEach((row) => {
    const pDate = parseDate(row.PostingDate);
    if (!pDate || !isDateInWindow(pDate, windowStartDate, snapshotDate)) return;

    const rowSku = (row.MaterialNumber || '').trim().toUpperCase();
    const rowSite = (row.PlantCode || '').trim().toUpperCase();

    if (rowSku === item.sku.toUpperCase() && rowSite === item.site.toUpperCase()) {
      const reg = (row.RegionId || '').trim().toUpperCase();
      const mv = (row.MovementType || '').trim();
      const isGR = goodsReceiptSet.has(`${reg}|${mv}`) || fallbackGoodsReceiptSet.has(mv);
      if (isGR) {
        qualifyingDates.push(pDate.toISOString().slice(0, 10));
      }
    }
  });

  const sortedQualifyingDates = Array.from(new Set(qualifyingDates)).sort();

  // Substitution sibling details
  let substitutionDetails = null;
  if (item.logicRuleType === 'gtin_sub' || item.logicRuleType === 'segment_sub') {
    const isGtin = item.logicRuleType === 'gtin_sub';
    const targetAttribute = isGtin ? item.gtin : item.segment;

    const siblingResults = results.filter(
      (r) =>
        r.site.toUpperCase() === item.site.toUpperCase() &&
        r.sku.toUpperCase() !== item.sku.toUpperCase() &&
        r.isOld &&
        (isGtin
          ? (r.gtin || '').toUpperCase() === (targetAttribute || '').toUpperCase()
          : (r.segment || '').toUpperCase() === (targetAttribute || '').toUpperCase())
    );

    substitutionDetails = {
      rule_used: isGtin ? 'GTIN Substitution (Rule 5a)' : 'Hierarchy / Segment Substitution (Rule 5b)',
      matched_attribute: targetAttribute,
      sibling_skus_averaged: siblingResults.map((s) => ({
        sku: s.sku,
        sku_description: s.skuDescription,
        individual_iat_days: s.interarrivalTimeDays,
      })),
    };
  } else if (item.logicRuleType === 'default') {
    substitutionDetails = {
      rule_used: 'Default Fallback (Rule 5c)',
      note: 'No organic goods receipt history or organic qualifying sibling SKUs found at this site. Standard 182-day default applied.',
    };
  }

  return {
    status: 'success',
    sku: item.sku,
    sku_description: item.skuDescription,
    site: item.site,
    site_description: item.siteDescription,
    region: item.regionId,
    site_location_type: item.siteLocationType,
    status_type: item.isOld ? 'OLD' : 'NEW',
    formula_used: item.logicUsed,
    qualifying_count: item.distinctPeriodCount,
    period_type: item.periodType,
    qualifying_dates: sortedQualifyingDates,
    interarrival_time_days: item.interarrivalTimeDays,
    formatted_iat: item.formattedIAT,
    logic_rule_type: item.logicRuleType,
    substitution_details: substitutionDetails,
  };
}

export function toolQueryResults(
  args: {
    filter_criteria?: {
      region?: string;
      status?: string;
      logic_used?: string;
    };
    sort_by?: string;
    direction?: string;
    top_n?: number;
  },
  context: CalculationInput
) {
  const currentCalc = calculateIAT(context);
  let rows = currentCalc.results;

  const filters = args.filter_criteria || {};
  if (filters.region && filters.region.toLowerCase() !== 'all') {
    const regQuery = filters.region.trim().toLowerCase();
    rows = rows.filter((r) => r.regionId.toLowerCase() === regQuery);
  }

  if (filters.status && filters.status.toLowerCase() !== 'all') {
    const st = filters.status.trim().toLowerCase();
    if (st === 'old') rows = rows.filter((r) => r.isOld);
    if (st === 'new') rows = rows.filter((r) => !r.isOld);
  }

  if (filters.logic_used && filters.logic_used.toLowerCase() !== 'all') {
    const lu = filters.logic_used.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.logicRuleType.toLowerCase() === lu ||
        r.logicUsed.toLowerCase().includes(lu)
    );
  }

  const sortBy = args.sort_by || 'interarrivalTimeDays';
  const direction = (args.direction || 'asc').toLowerCase();

  rows.sort((a, b) => {
    let valA: any = a.interarrivalTimeDays;
    let valB: any = b.interarrivalTimeDays;

    if (sortBy === 'sku') {
      valA = a.sku;
      valB = b.sku;
    } else if (sortBy === 'site') {
      valA = a.site;
      valB = b.site;
    }

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const topN = args.top_n && args.top_n > 0 ? args.top_n : rows.length;
  const sliced = rows.slice(0, topN);

  return {
    total_matches: rows.length,
    returned_count: sliced.length,
    rows: sliced.map((r, idx) => ({
      rank: idx + 1,
      sku: r.sku,
      site: r.site,
      sku_description: r.skuDescription,
      site_description: r.siteDescription,
      region: r.regionId,
      site_location_type: r.siteLocationType,
      status: r.isOld ? 'OLD' : 'NEW',
      interarrivalTimeDays: r.interarrivalTimeDays,
      formatted_iat: r.formattedIAT,
      logic_rule_type: r.logicRuleType,
      logic_used: r.logicUsed,
    })),
  };
}

export function toolSimulateSnapshot(
  args: { hypothetical_date: string },
  context: CalculationInput
) {
  const currentCalc = calculateIAT(context);
  const currentResultsMap = new Map<string, IATResult>();
  currentCalc.results.forEach((r) => {
    currentResultsMap.set(`${r.sku.toUpperCase()}|${r.site.toUpperCase()}`, r);
  });

  const simContext: CalculationInput = {
    ...context,
    snapshotDateStr: args.hypothetical_date,
  };

  const simCalc = calculateIAT(simContext);
  const simResults = simCalc.results;

  const iatChanges: any[] = [];
  const statusFlips: any[] = [];
  const ruleChanges: any[] = [];

  simResults.forEach((simR) => {
    const key = `${simR.sku.toUpperCase()}|${simR.site.toUpperCase()}`;
    const curR = currentResultsMap.get(key);

    if (curR) {
      const iatDiff = simR.interarrivalTimeDays - curR.interarrivalTimeDays;
      const hasIatChanged = Math.abs(iatDiff) > 0.001;
      const hasStatusChanged = curR.isOld !== simR.isOld;
      const hasRuleChanged = curR.logicRuleType !== simR.logicRuleType;

      if (hasIatChanged || hasStatusChanged || hasRuleChanged) {
        const itemChange = {
          sku: simR.sku,
          site: simR.site,
          sku_description: simR.skuDescription,
          site_description: simR.siteDescription,
          current_iat: curR.interarrivalTimeDays,
          hypothetical_iat: simR.interarrivalTimeDays,
          iat_delta: iatDiff,
          current_status: curR.isOld ? 'OLD' : 'NEW',
          hypothetical_status: simR.isOld ? 'OLD' : 'NEW',
          current_rule: curR.logicUsed,
          hypothetical_rule: simR.logicUsed,
        };

        if (hasIatChanged) iatChanges.push(itemChange);
        if (hasStatusChanged) statusFlips.push(itemChange);
        if (hasRuleChanged) ruleChanges.push(itemChange);
      }
    }
  });

  return {
    hypothetical_date: args.hypothetical_date,
    current_snapshot_date: context.snapshotDateStr,
    total_sku_sites: simResults.length,
    changed_iat_count: iatChanges.length,
    status_flipped_count: statusFlips.length,
    rule_changed_count: ruleChanges.length,
    status_flips: statusFlips,
    rule_changes: ruleChanges,
    all_iat_changes: iatChanges,
    hypothetical_summary: simCalc.summary,
  };
}
