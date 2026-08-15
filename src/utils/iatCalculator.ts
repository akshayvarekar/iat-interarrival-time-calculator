import {
  IATResult,
  IATSummary,
  MovementData,
  MovementTypeRef,
  SiteMaster,
  SkuMaster,
} from '../types';
import { getISOWeekKey, getLookbackWindow, isDateInWindow, parseDate } from './dateUtils';

export interface CalculationInput {
  siteMaster: SiteMaster[];
  skuMaster: SkuMaster[];
  movementTypeRef: MovementTypeRef[];
  movementData: MovementData[];
  snapshotDateStr: string;
}

export function calculateIAT(input: CalculationInput): {
  results: IATResult[];
  summary: IATSummary;
  windowInfo: { windowStartDateStr: string; snapshotDateStr: string };
} {
  const {
    siteMaster,
    skuMaster,
    movementTypeRef,
    movementData,
    snapshotDateStr,
  } = input;

  const { windowStartDate, snapshotDate, windowStartDateStr, snapshotDateStr: normSnapshotDateStr } =
    getLookbackWindow(snapshotDateStr, 182);

  // 1. Build lookup map for MovementType Reference: (RegionId, MovementType) => isGoodsReceipt boolean
  const goodsReceiptSet = new Set<string>();
  const fallbackGoodsReceiptSet = new Set<string>();

  movementTypeRef.forEach((ref) => {
    const isGR = (ref.IsGoodsReceipt || '').trim().toUpperCase() === 'Y';
    if (isGR) {
      const regionKey = (ref.RegionId || '').trim().toUpperCase();
      const mvType = (ref.MovementType || '').trim();
      goodsReceiptSet.add(`${regionKey}|${mvType}`);
      fallbackGoodsReceiptSet.add(mvType);
    }
  });

  function isGoodsReceipt(regionId: string, movementType: string): boolean {
    const regKey = (regionId || '').trim().toUpperCase();
    const mvType = (movementType || '').trim();
    if (goodsReceiptSet.has(`${regKey}|${mvType}`)) return true;
    return fallbackGoodsReceiptSet.has(mvType);
  }

  // 2. Pre-filter movement data within the lookback window [windowStartDate, snapshotDate]
  // Group goods receipt movements by `SKU|Site`
  interface SkuSiteMovements {
    totalMovements: number;
    goodsReceiptDates: Date[];
  }

  const movementsMap = new Map<string, SkuSiteMovements>();

  movementData.forEach((row) => {
    const postingDate = parseDate(row.PostingDate);
    if (!postingDate || !isDateInWindow(postingDate, windowStartDate, snapshotDate)) {
      return;
    }

    const sku = (row.MaterialNumber || '').trim();
    const site = (row.PlantCode || '').trim();
    const region = (row.RegionId || '').trim();
    const mvType = (row.MovementType || '').trim();

    if (!sku || !site) return;

    // ALWAYS read MaterialNumber as SKU and PlantCode as Site (SKU|SITE key)
    const key = `${sku.toUpperCase()}|${site.toUpperCase()}`;
    if (!movementsMap.has(key)) {
      movementsMap.set(key, { totalMovements: 0, goodsReceiptDates: [] });
    }

    const entry = movementsMap.get(key)!;
    entry.totalMovements += 1;

    if (isGoodsReceipt(region, mvType)) {
      entry.goodsReceiptDates.push(postingDate);
    }
  });

  // 3. Build lookup maps for Site Master and SKU Master
  const siteMap = new Map<string, SiteMaster>();
  siteMaster.forEach((s) => {
    if (s.Site) siteMap.set(s.Site.trim().toUpperCase(), s);
  });

  const skuMap = new Map<string, SkuMaster>();
  skuMaster.forEach((s) => {
    if (s.SKU) skuMap.set(s.SKU.trim().toUpperCase(), s);
  });

  // 4. Form the SKU-Site evaluation universe
  // Only generate a SKU-Site pair to evaluate if SKU's RegionId matches Site's RegionId
  const skuSitePairsSet = new Set<string>();

  skuMaster.forEach((skuObj) => {
    const skuCode = (skuObj.SKU || '').trim();
    if (!skuCode) return;
    const skuRegion = (skuObj.RegionId || '').trim().toUpperCase();

    siteMaster.forEach((siteObj) => {
      const siteCode = (siteObj.Site || '').trim();
      if (!siteCode) return;
      const siteRegion = (siteObj.RegionId || '').trim().toUpperCase();

      // Only include pair if region matches
      if (skuRegion && siteRegion && skuRegion === siteRegion) {
        skuSitePairsSet.add(`${skuCode.toUpperCase()}|${siteCode.toUpperCase()}`);
      }
    });
  });

  // Separate OLD SKU-Sites (Direct calculation) vs NEW SKU-Sites
  interface IntermediateResult extends Partial<IATResult> {
    sku: string;
    site: string;
    key: string;
    isOld: boolean;
    directIAT?: number;
  }

  const intermediateList: IntermediateResult[] = [];

  // Map to store calculated IATs per site for quick substitution lookups
  const siteCalculatedMap = new Map<
    string,
    Map<string, { sku: string; iat: number; gtin: string; segment: string; isDirect: boolean }>
  >();

  function recordSiteCalculated(
    siteUpper: string,
    skuUpper: string,
    skuCode: string,
    iat: number,
    gtin: string,
    segment: string,
    isDirect: boolean
  ) {
    if (!siteCalculatedMap.has(siteUpper)) {
      siteCalculatedMap.set(siteUpper, new Map());
    }
    siteCalculatedMap.get(siteUpper)!.set(skuUpper, {
      sku: skuCode,
      iat,
      gtin: (gtin || '').trim().toUpperCase(),
      segment: (segment || '').trim().toUpperCase(),
      isDirect,
    });
  }

  // --- PASS 1: Calculate OLD SKU-Sites (Direct Calculation) ---
  skuSitePairsSet.forEach((key) => {
    const [skuUpper, siteUpper] = key.split('|');
    const skuObj = skuMap.get(skuUpper);
    const siteObj = siteMap.get(siteUpper);

    const skuCode = skuObj ? skuObj.SKU : skuUpper;
    const siteCode = siteObj ? siteObj.Site : siteUpper;
    const skuDesc = skuObj ? skuObj.PartDescription : 'N/A';
    const siteDesc = siteObj ? siteObj.PlantName : 'N/A';
    const rawLocType = siteObj ? (siteObj.SiteLocationType || 'Spoke DC').trim() : 'Spoke DC';
    const isHub = rawLocType.toUpperCase().includes('HUB');
    const normalizedLocType = isHub ? 'Hub DC' : 'Spoke DC';
    const region = siteObj?.RegionId || skuObj?.RegionId || 'N/A';
    const gtin = skuObj?.GTIN || '';
    const segment = skuObj?.Segment || '';
    const category = skuObj?.Category || '';
    const division = skuObj?.Division || '';

    const movementInfo = movementsMap.get(key) || { totalMovements: 0, goodsReceiptDates: [] };
    const goodsReceiptCount = movementInfo.goodsReceiptDates.length;
    const isOld = goodsReceiptCount > 0;

    if (isOld) {
      let distinctPeriodCount = 0;
      let periodType: 'ISO Weeks' | 'Days' = 'Days';

      if (isHub) {
        periodType = 'ISO Weeks';
        const isoWeeks = new Set<string>();
        movementInfo.goodsReceiptDates.forEach((d) => isoWeeks.add(getISOWeekKey(d)));
        distinctPeriodCount = isoWeeks.size;
      } else {
        periodType = 'Days';
        const daysSet = new Set<string>();
        movementInfo.goodsReceiptDates.forEach((d) =>
          daysSet.add(d.toISOString().slice(0, 10))
        );
        distinctPeriodCount = daysSet.size;
      }

      const countForDivision = Math.max(1, distinctPeriodCount);
      const iat = 182 / countForDivision;

      const logicUsed = isHub
        ? `Direct Calc (Hub DC - ${distinctPeriodCount} ISO week${distinctPeriodCount === 1 ? '' : 's'})`
        : `Direct Calc (Spoke DC - ${distinctPeriodCount} day${distinctPeriodCount === 1 ? '' : 's'})`;

      const logicRuleType = isHub ? 'direct_hub' : 'direct_spoke';

      recordSiteCalculated(siteUpper, skuUpper, skuCode, iat, gtin, segment, true);

      intermediateList.push({
        key,
        sku: skuCode,
        site: siteCode,
        skuDescription: skuDesc,
        siteDescription: siteDesc,
        siteLocationType: normalizedLocType,
        regionId: region,
        gtin,
        segment,
        category,
        division,
        isOld: true,
        totalMovementsInWindow: movementInfo.totalMovements,
        goodsReceiptMovementsInWindow: goodsReceiptCount,
        distinctPeriodCount,
        periodType,
        interarrivalTimeDays: iat,
        formattedIAT: iat.toFixed(2),
        logicRuleType,
        logicUsed,
        directIAT: iat,
      });
    } else {
      // New SKU-Site placeholder for Pass 2
      intermediateList.push({
        key,
        sku: skuCode,
        site: siteCode,
        skuDescription: skuDesc,
        siteDescription: siteDesc,
        siteLocationType: normalizedLocType,
        regionId: region,
        gtin,
        segment,
        category,
        division,
        isOld: false,
        totalMovementsInWindow: movementInfo.totalMovements,
        goodsReceiptMovementsInWindow: 0,
        distinctPeriodCount: 0,
        periodType: isHub ? 'ISO Weeks' : 'Days',
      });
    }
  });

  // --- PASS 2: Calculate NEW SKU-Sites (Substitution Rules 5a -> 5b -> 5c) ---
  const finalResults: IATResult[] = [];

  intermediateList.forEach((item) => {
    if (item.isOld) {
      finalResults.push(item as IATResult);
      return;
    }

    const skuUpper = item.sku.toUpperCase();
    const siteUpper = item.site.toUpperCase();
    const targetGtin = (item.gtin || '').trim().toUpperCase();
    const targetSegment = (item.segment || '').trim().toUpperCase();

    const siteCalculated = siteCalculatedMap.get(siteUpper);

    // 5a. GTIN Substitution: look for other SKUs with same GTIN at same site with direct calculated IAT
    let substitutedSkus: string[] = [];
    let calculatedIAT: number | null = null;
    let logicUsed = '';
    let logicRuleType: 'gtin_sub' | 'segment_sub' | 'default' = 'default';

    if (targetGtin && siteCalculated) {
      const gtinMatches: { sku: string; iat: number }[] = [];
      siteCalculated.forEach((val, existingSkuUpper) => {
        if (existingSkuUpper !== skuUpper && val.gtin === targetGtin && val.isDirect) {
          gtinMatches.push({ sku: val.sku, iat: val.iat });
        }
      });

      if (gtinMatches.length > 0) {
        const sum = gtinMatches.reduce((acc, m) => acc + m.iat, 0);
        calculatedIAT = sum / gtinMatches.length;
        substitutedSkus = gtinMatches.map((m) => m.sku);
        logicRuleType = 'gtin_sub';
        logicUsed = `GTIN Substitution (${item.gtin} - avg of ${gtinMatches.length} SKU${
          gtinMatches.length === 1 ? '' : 's'
        }: ${substitutedSkus.join(', ')})`;
      }
    }

    // 5b. Segment Substitution: look for other SKUs with same Segment at same site with direct calculated IAT (organic movement history only)
    if (calculatedIAT === null && targetSegment && siteCalculated) {
      const segmentMatches: { sku: string; iat: number }[] = [];
      siteCalculated.forEach((val, existingSkuUpper) => {
        if (existingSkuUpper !== skuUpper && val.segment === targetSegment && val.isDirect) {
          segmentMatches.push({ sku: val.sku, iat: val.iat });
        }
      });

      if (segmentMatches.length > 0) {
        const sum = segmentMatches.reduce((acc, m) => acc + m.iat, 0);
        calculatedIAT = sum / segmentMatches.length;
        substitutedSkus = segmentMatches.map((m) => m.sku);
        logicRuleType = 'segment_sub';
        logicUsed = `Hierarchy Substitution (${item.segment} - avg of ${segmentMatches.length} SKU${
          segmentMatches.length === 1 ? '' : 's'
        }: ${substitutedSkus.join(', ')})`;
      }
    }

    // 5c. Default Fallback (182 days)
    if (calculatedIAT === null) {
      calculatedIAT = 182;
      logicRuleType = 'default';
      logicUsed = 'Default (182 days)';
    }

    // Record this substitution
    recordSiteCalculated(
      siteUpper,
      skuUpper,
      item.sku,
      calculatedIAT,
      item.gtin || '',
      item.segment || '',
      false
    );

    finalResults.push({
      ...(item as IATResult),
      interarrivalTimeDays: calculatedIAT,
      formattedIAT: calculatedIAT.toFixed(2),
      logicRuleType,
      logicUsed,
      substitutedFromSkus: substitutedSkus.length > 0 ? substitutedSkus : undefined,
    });
  });

  const summary = calculateSummaryFromResults(finalResults);

  return {
    results: finalResults,
    summary,
    windowInfo: {
      windowStartDateStr,
      snapshotDateStr: normSnapshotDateStr,
    },
  };
}

/**
 * Calculates dynamic summary metrics from a filtered list of IATResults.
 */
export function calculateSummaryFromResults(
  resultsList: IATResult[],
  baseListForPills?: IATResult[]
): IATSummary {
  const totalCount = resultsList.length;
  const oldResults = resultsList.filter((r) => r.isOld);
  const newResults = resultsList.filter((r) => !r.isOld);

  const pillsSource = baseListForPills || resultsList;
  const directHubCount = pillsSource.filter((r) => r.logicRuleType === 'direct_hub').length;
  const directSpokeCount = pillsSource.filter((r) => r.logicRuleType === 'direct_spoke').length;
  const gtinSubCount = pillsSource.filter((r) => r.logicRuleType === 'gtin_sub').length;
  const segmentSubCount = pillsSource.filter((r) => r.logicRuleType === 'segment_sub').length;
  const defaultCount = pillsSource.filter((r) => r.logicRuleType === 'default').length;

  const iatValues = resultsList.map((r) => r.interarrivalTimeDays);
  const sumIAT = iatValues.reduce((a, b) => a + b, 0);
  const avgIATDays = totalCount > 0 ? sumIAT / totalCount : 0;
  const minIATDays = iatValues.length > 0 ? Math.min(...iatValues) : 0;
  const maxIATDays = iatValues.length > 0 ? Math.max(...iatValues) : 0;

  return {
    totalSkuSites: totalCount,
    oldSkuSitesCount: oldResults.length,
    newSkuSitesCount: newResults.length,
    directHubCount,
    directSpokeCount,
    gtinSubCount,
    segmentSubCount,
    defaultCount,
    avgIATDays,
    minIATDays,
    maxIATDays,
  };
}
