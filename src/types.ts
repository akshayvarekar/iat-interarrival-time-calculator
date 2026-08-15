/**
 * Types and Interfaces for Interarrival Time (IAT) Calculator & Business Impact Analysis
 */

export interface SiteMaster {
  Site: string;
  PlantName: string;
  SiteLocationType: 'Hub DC' | 'Spoke DC' | string;
  RegionId: string;
}

export interface SkuMaster {
  SKU: string;
  PartDescription: string;
  GTIN: string;
  RegionId: string;
  Segment: string;
  Category: string;
  Division: string;
}

export interface MovementTypeRef {
  RegionId: string;
  MovementType: string;
  MovementTypeDesc: string;
  IsGoodsReceipt: 'Y' | 'N' | string;
}

export interface MovementData {
  MovementId: string;
  MaterialNumber: string;
  PlantCode: string;
  RegionId: string;
  MovementType: string;
  PostingDate: string; // YYYY-MM-DD or parsed
}

export interface DemandAndCost {
  SKU: string;
  Site: string;
  PartDescription?: string;
  DailyDemandUnits: number | string;
  UnitCostUSD: number | string;
  BaselineLeadTimeDays: number | string;
}

export type LogicRuleType = 'direct_hub' | 'direct_spoke' | 'gtin_sub' | 'segment_sub' | 'default';

export interface IATResult {
  sku: string;
  site: string;
  skuDescription: string;
  siteDescription: string;
  siteLocationType: string;
  regionId: string;
  gtin: string;
  segment: string;
  category: string;
  division: string;
  
  isOld: boolean;
  totalMovementsInWindow: number;
  goodsReceiptMovementsInWindow: number;
  distinctPeriodCount: number; // ISO weeks for Hub DC, calendar days for Spoke DC
  periodType: 'ISO Weeks' | 'Days' | 'N/A';
  
  interarrivalTimeDays: number; // Calculated IAT
  formattedIAT: string; // e.g. "15.17" or "182.00"
  
  logicRuleType: LogicRuleType;
  logicUsed: string; // Plain text description e.g. "Direct Calc (Hub DC - 13 ISO weeks)"
  substitutedFromSkus?: string[]; // List of SKUs used for substitution average
}

export type RiskFlagType =
  | 'Understated buffer - stockout risk'
  | 'Overstated buffer - excess carrying cost'
  | 'No gap';

export interface BusinessImpactRow {
  sku: string;
  site: string;
  partDescription: string;
  actualIAT: number; // in days
  baselineLeadTimeDays: number;
  dailyDemandUnits: number;
  unitCostUSD: number;
  cycleStockActual: number; // DailyDemandUnits * actualIAT / 2
  cycleStockNaive: number; // DailyDemandUnits * baselineLeadTimeDays / 2
  deltaUnits: number; // cycleStockActual - cycleStockNaive
  deltaCostUSD: number; // deltaUnits * unitCostUSD
  riskFlag: RiskFlagType;
  siteLocationType?: string;
  regionId?: string;
  logicRuleType?: LogicRuleType;
}

export interface BusinessImpactSummary {
  totalCount: number;
  totalUnderstatedCost: number; // sum of deltaCostUSD for rows where deltaCostUSD > 0
  totalOverstatedCost: number; // sum of Math.abs(deltaCostUSD) for rows where deltaCostUSD < 0
  netImpactCost: number; // sum of deltaCostUSD
  stockoutRiskCount: number;
  excessCarryingCostCount: number;
  noGapCount: number;
}

export type CsvFileKey =
  | 'site_master'
  | 'sku_master'
  | 'movement_type_reference'
  | 'movement_data'
  | 'demand_and_cost';

export interface CsvValidationStatus {
  fileKey: CsvFileKey;
  fileName: string;
  rowCount: number;
  isValid: boolean;
  missingColumns: string[];
  errorMessage?: string;
}

export interface IATSummary {
  totalSkuSites: number;
  oldSkuSitesCount: number;
  newSkuSitesCount: number;
  directHubCount: number;
  directSpokeCount: number;
  gtinSubCount: number;
  segmentSubCount: number;
  defaultCount: number;
  avgIATDays: number;
  minIATDays: number;
  maxIATDays: number;
}
