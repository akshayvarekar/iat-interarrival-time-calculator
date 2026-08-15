import Papa from 'papaparse';
import {
  MovementData,
  MovementTypeRef,
  SiteMaster,
  SkuMaster,
  DemandAndCost,
} from '../types';

// Enterprise reference datasets with Hub DC, Spoke DC, and NA region naming
export const SAMPLE_SITE_MASTER_CSV = `Site,PlantName,SiteLocationType,RegionId
EU_HUB_01,Rotterdam DC,Hub DC,Europe
EU_SPOKE_01,Lyon Regional DC,Spoke DC,Europe
NA_HUB_01,Chicago DC,Hub DC,NA
NA_SPOKE_01,Dallas Regional DC,Spoke DC,NA`;

export const SAMPLE_SKU_MASTER_CSV = `SKU,PartDescription,GTIN,RegionId,Segment,Category,Division
SKU1001,Detergent Liquid 2L,G001,Europe,Matic,Fabric Care,Home Care
SKU1002,Detergent Powder 3kg,G002,Europe,Matic,Fabric Care,Home Care
SKU1003,Soap Bar 100g,G003,Europe,Bar Soap,Personal Wash,Personal Care
SKU2001,Bouillon Cubes 24pk,G010,NA,Bouillon,Cooking Aids,Foods
SKU2002,Mayonnaise 500g,G011,NA,Sauces,Dressings,Foods
SKU1050,Detergent Liquid 2L ECOMM PACK,G001,Europe,Matic,Fabric Care,Home Care
SKU1060,Fabric Softener 1L NEW LAUNCH,G099,Europe,Matic,Fabric Care,Home Care
SKU9999,Experimental Product X,G999,Europe,Unclassified,Unclassified,Unclassified`;

export const SAMPLE_MOVEMENT_TYPE_REF_CSV = `RegionId,MovementType,MovementTypeDesc,IsGoodsReceipt
Europe,101,Goods receipt,Y
Europe,102,Reversal of goods receipt for purchase order,N
Europe,301,Plant to Plant transfer,Y
Europe,Z61,Alternative Plant to Plant Transfer,Y
NA,101,Goods receipt,Y
NA,102,Reversal of goods receipt for purchase order,N`;

export const SAMPLE_MOVEMENT_DATA_CSV = `MovementId,MaterialNumber,PlantCode,RegionId,MovementType,PostingDate
MV00001,SKU1001,EU_HUB_01,Europe,101,2026-02-09
MV00002,SKU1001,EU_HUB_01,Europe,301,2026-02-11
MV00003,SKU1001,EU_HUB_01,Europe,101,2026-02-27
MV00004,SKU1001,EU_HUB_01,Europe,301,2026-02-27
MV00005,SKU1001,EU_HUB_01,Europe,101,2026-03-07
MV00006,SKU1001,EU_HUB_01,Europe,101,2026-03-13
MV00007,SKU1001,EU_HUB_01,Europe,101,2026-04-02
MV00008,SKU1001,EU_HUB_01,Europe,101,2026-04-12
MV00009,SKU1001,EU_HUB_01,Europe,101,2026-05-17
MV00010,SKU1001,EU_HUB_01,Europe,101,2026-05-23
MV00011,SKU1001,EU_HUB_01,Europe,101,2026-06-10
MV00012,SKU1001,EU_HUB_01,Europe,301,2026-06-11
MV00013,SKU1001,EU_HUB_01,Europe,101,2026-06-29
MV00014,SKU1001,EU_HUB_01,Europe,301,2026-06-29
MV00015,SKU1001,EU_HUB_01,Europe,101,2026-07-08
MV00016,SKU1001,EU_HUB_01,Europe,101,2026-07-24
MV00017,SKU1001,EU_HUB_01,Europe,301,2026-07-24
MV00018,SKU1001,EU_HUB_01,Europe,101,2026-08-01
MV00019,SKU1002,EU_HUB_01,Europe,101,2026-03-01
MV00020,SKU1002,EU_HUB_01,Europe,101,2026-03-04
MV00021,SKU1002,EU_HUB_01,Europe,101,2026-04-17
MV00022,SKU1002,EU_HUB_01,Europe,101,2026-05-05
MV00023,SKU1002,EU_HUB_01,Europe,101,2026-06-13
MV00024,SKU1002,EU_HUB_01,Europe,101,2026-06-22
MV00025,SKU1002,EU_HUB_01,Europe,101,2026-06-29
MV00026,SKU1003,EU_SPOKE_01,Europe,101,2026-02-27
MV00027,SKU1003,EU_SPOKE_01,Europe,101,2026-03-01
MV00028,SKU1003,EU_SPOKE_01,Europe,101,2026-03-06
MV00029,SKU1003,EU_SPOKE_01,Europe,101,2026-03-22
MV00030,SKU1003,EU_SPOKE_01,Europe,101,2026-03-24
MV00031,SKU1003,EU_SPOKE_01,Europe,101,2026-04-03
MV00032,SKU1003,EU_SPOKE_01,Europe,101,2026-04-08
MV00033,SKU1003,EU_SPOKE_01,Europe,101,2026-04-09
MV00034,SKU1003,EU_SPOKE_01,Europe,101,2026-04-12
MV00035,SKU1003,EU_SPOKE_01,Europe,101,2026-04-18
MV00036,SKU1003,EU_SPOKE_01,Europe,101,2026-04-21
MV00037,SKU1003,EU_SPOKE_01,Europe,101,2026-04-24
MV00038,SKU1003,EU_SPOKE_01,Europe,101,2026-05-10
MV00039,SKU1003,EU_SPOKE_01,Europe,101,2026-05-13
MV00040,SKU1003,EU_SPOKE_01,Europe,101,2026-05-14
MV00041,SKU1003,EU_SPOKE_01,Europe,101,2026-05-17
MV00042,SKU1003,EU_SPOKE_01,Europe,101,2026-06-05
MV00043,SKU1003,EU_SPOKE_01,Europe,101,2026-06-07
MV00044,SKU1003,EU_SPOKE_01,Europe,101,2026-06-25
MV00045,SKU1003,EU_SPOKE_01,Europe,101,2026-07-14
MV00046,SKU1003,EU_SPOKE_01,Europe,101,2026-07-21
MV00047,SKU1003,EU_SPOKE_01,Europe,101,2026-07-24
MV00048,SKU1003,EU_SPOKE_01,Europe,101,2026-07-28
MV00049,SKU1003,EU_SPOKE_01,Europe,101,2026-07-29
MV00050,SKU1003,EU_SPOKE_01,Europe,101,2026-07-31
MV00051,SKU1003,EU_SPOKE_01,Europe,101,2026-08-03
MV00052,SKU2001,NA_HUB_01,NA,101,2026-04-05
MV00053,SKU2001,NA_HUB_01,NA,101,2026-04-12
MV00054,SKU2001,NA_HUB_01,NA,101,2026-04-26
MV00055,SKU2001,NA_HUB_01,NA,101,2026-06-08
MV00056,SKU2001,NA_HUB_01,NA,101,2026-06-30
MV00057,SKU2001,NA_HUB_01,NA,101,2026-07-19
MV00058,SKU2002,NA_SPOKE_01,NA,101,2026-02-17
MV00059,SKU2002,NA_SPOKE_01,NA,101,2026-02-25
MV00060,SKU2002,NA_SPOKE_01,NA,101,2026-03-16
MV00061,SKU2002,NA_SPOKE_01,NA,101,2026-03-17
MV00062,SKU2002,NA_SPOKE_01,NA,101,2026-04-04
MV00063,SKU2002,NA_SPOKE_01,NA,101,2026-04-13
MV00064,SKU2002,NA_SPOKE_01,NA,101,2026-04-17
MV00065,SKU2002,NA_SPOKE_01,NA,101,2026-04-18
MV00066,SKU2002,NA_SPOKE_01,NA,101,2026-04-30
MV00067,SKU2002,NA_SPOKE_01,NA,101,2026-05-21
MV00068,SKU2002,NA_SPOKE_01,NA,101,2026-05-22
MV00069,SKU2002,NA_SPOKE_01,NA,101,2026-06-06
MV00070,SKU2002,NA_SPOKE_01,NA,101,2026-06-16
MV00071,SKU2002,NA_SPOKE_01,NA,101,2026-07-02
MV00072,SKU2002,NA_SPOKE_01,NA,101,2026-07-04
MV00073,SKU2002,NA_SPOKE_01,NA,101,2026-07-23
MV00074,SKU2002,NA_SPOKE_01,NA,101,2026-07-26`;

// Exactly the 7 active SKU-Sites defined in demand_and_cost.csv
export const SAMPLE_DEMAND_AND_COST_CSV = `SKU,Site,PartDescription,DailyDemandUnits,UnitCostUSD,BaselineLeadTimeDays
SKU1001,EU_HUB_01,Detergent Liquid 2L,120,4.50,14
SKU1002,EU_HUB_01,Detergent Powder 3kg,85,6.20,28
SKU1003,EU_SPOKE_01,Soap Bar 100g,250,1.20,7
SKU1050,EU_HUB_01,Detergent Liquid 2L ECOMM PACK,40,5.10,21
SKU1060,EU_HUB_01,Fabric Softener 1L NEW LAUNCH,60,3.80,30
SKU2001,NA_HUB_01,Bouillon Cubes 24pk,180,2.75,25
SKU2002,NA_SPOKE_01,Mayonnaise 500g,110,3.40,10`;

export interface ParseResult<T> {
  data: T[];
  errors: string[];
  headers: string[];
}

/**
 * Generic CSV string parser using PapaParse with header auto-trimming and normalization
 */
export function parseCsvText<T>(csvText: string): ParseResult<T> {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const errors: string[] = result.errors.map((e) => `Line ${e.row}: ${e.message}`);
  
  // Clean object keys and string values
  const cleanedData = (result.data || []).map((row) => {
    const cleanRow: Record<string, string> = {};
    for (const key in row) {
      if (Object.prototype.hasOwnProperty.call(row, key)) {
        cleanRow[key.trim()] = (row[key] || '').trim();
      }
    }
    return cleanRow as unknown as T;
  });

  return {
    data: cleanedData,
    errors,
    headers: result.meta.fields ? result.meta.fields.map((f) => f.trim()) : [],
  };
}

/**
 * Validates whether parsed CSV contains required columns
 */
export function validateCsvHeaders(
  headers: string[],
  requiredColumns: string[]
): { isValid: boolean; missingColumns: string[] } {
  const normalizedHeaders = headers.map((h) => h.toLowerCase());
  const missing = requiredColumns.filter((col) => !normalizedHeaders.includes(col.toLowerCase()));
  return {
    isValid: missing.length === 0,
    missingColumns: missing,
  };
}

export const REQUIRED_SITE_MASTER_COLS = ['Site', 'SiteLocationType'];
export const REQUIRED_SKU_MASTER_COLS = ['SKU', 'GTIN', 'Segment'];
export const REQUIRED_MOVEMENT_TYPE_REF_COLS = ['RegionId', 'MovementType', 'IsGoodsReceipt'];
export const REQUIRED_MOVEMENT_DATA_COLS = ['MaterialNumber', 'PlantCode', 'MovementType', 'PostingDate'];
export const REQUIRED_DEMAND_AND_COST_COLS = ['SKU', 'Site', 'DailyDemandUnits', 'UnitCostUSD', 'BaselineLeadTimeDays'];
