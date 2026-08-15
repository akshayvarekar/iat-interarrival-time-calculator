/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { CsvUploader } from './components/CsvUploader';
import { SnapshotControls } from './components/SnapshotControls';
import { SummaryCards } from './components/SummaryCards';
import { ResultsTable } from './components/ResultsTable';
import { AiInsightsChat } from './components/AiInsightsChat';
import { BusinessImpactView } from './components/BusinessImpactView';
import { LogicHelpModal } from './components/LogicHelpModal';
import { CsvViewerModal } from './components/CsvViewerModal';

import {
  SAMPLE_SITE_MASTER_CSV,
  SAMPLE_SKU_MASTER_CSV,
  SAMPLE_MOVEMENT_TYPE_REF_CSV,
  SAMPLE_MOVEMENT_DATA_CSV,
  SAMPLE_DEMAND_AND_COST_CSV,
  parseCsvText,
  validateCsvHeaders,
  REQUIRED_SITE_MASTER_COLS,
  REQUIRED_SKU_MASTER_COLS,
  REQUIRED_MOVEMENT_TYPE_REF_COLS,
  REQUIRED_MOVEMENT_DATA_COLS,
  REQUIRED_DEMAND_AND_COST_COLS,
} from './utils/csvParser';

import {
  SiteMaster,
  SkuMaster,
  MovementTypeRef,
  MovementData,
  DemandAndCost,
  CsvValidationStatus,
  IATResult,
  IATSummary,
} from './types';

import { calculateIAT, calculateSummaryFromResults } from './utils/iatCalculator';
import { calculateBusinessImpact } from './utils/businessImpactCalculator';
import { exportToExcel } from './utils/excelExporter';

export default function App() {
  // 1. Navigation Tab State
  const [activeTab, setActiveTab] = useState<'iat' | 'business_impact'>('iat');

  // 2. Raw CSV Content State (Initialized with standard reference dataset)
  const [siteMasterCsv, setSiteMasterCsv] = useState<string>(SAMPLE_SITE_MASTER_CSV);
  const [skuMasterCsv, setSkuMasterCsv] = useState<string>(SAMPLE_SKU_MASTER_CSV);
  const [movementTypeRefCsv, setMovementTypeRefCsv] = useState<string>(SAMPLE_MOVEMENT_TYPE_REF_CSV);
  const [movementDataCsv, setMovementDataCsv] = useState<string>(SAMPLE_MOVEMENT_DATA_CSV);
  const [demandAndCostCsv, setDemandAndCostCsv] = useState<string>(SAMPLE_DEMAND_AND_COST_CSV);

  // 3. Control & Table Filter State for IAT Tab
  const [snapshotDate, setSnapshotDate] = useState<string>('2026-08-10');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'old' | 'new'>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [activeRuleFilter, setActiveRuleFilter] = useState<string>('all');
  const [isCsvPanelsExpanded, setIsCsvPanelsExpanded] = useState<boolean>(false);

  // Modals state
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [previewFileKey, setPreviewFileKey] = useState<string | null>(null);

  // Calculation Results for IAT
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [results, setResults] = useState<IATResult[]>([]);
  const [summary, setSummary] = useState<IATSummary>({
    totalSkuSites: 0,
    oldSkuSitesCount: 0,
    newSkuSitesCount: 0,
    directHubCount: 0,
    directSpokeCount: 0,
    gtinSubCount: 0,
    segmentSubCount: 0,
    defaultCount: 0,
    avgIATDays: 0,
    minIATDays: 0,
    maxIATDays: 0,
  });
  const [windowStartDateStr, setWindowStartDateStr] = useState<string>('2026-02-09');

  // Parse CSV data & Validation Statuses
  const parsedData = useMemo(() => {
    const site = parseCsvText<SiteMaster>(siteMasterCsv);
    const sku = parseCsvText<SkuMaster>(skuMasterCsv);
    const ref = parseCsvText<MovementTypeRef>(movementTypeRefCsv);
    const mv = parseCsvText<MovementData>(movementDataCsv);
    const demand = parseCsvText<DemandAndCost>(demandAndCostCsv);

    const siteVal = validateCsvHeaders(site.headers, REQUIRED_SITE_MASTER_COLS);
    const skuVal = validateCsvHeaders(sku.headers, REQUIRED_SKU_MASTER_COLS);
    const refVal = validateCsvHeaders(ref.headers, REQUIRED_MOVEMENT_TYPE_REF_COLS);
    const mvVal = validateCsvHeaders(mv.headers, REQUIRED_MOVEMENT_DATA_COLS);
    const demandVal = validateCsvHeaders(demand.headers, REQUIRED_DEMAND_AND_COST_COLS);

    const statuses: Record<string, CsvValidationStatus> = {
      site_master: {
        fileKey: 'site_master',
        fileName: 'site_master.csv',
        rowCount: site.data.length,
        isValid: siteVal.isValid,
        missingColumns: siteVal.missingColumns,
      },
      sku_master: {
        fileKey: 'sku_master',
        fileName: 'sku_master.csv',
        rowCount: sku.data.length,
        isValid: skuVal.isValid,
        missingColumns: skuVal.missingColumns,
      },
      movement_type_reference: {
        fileKey: 'movement_type_reference',
        fileName: 'movement_type_reference.csv',
        rowCount: ref.data.length,
        isValid: refVal.isValid,
        missingColumns: refVal.missingColumns,
      },
      movement_data: {
        fileKey: 'movement_data',
        fileName: 'movement_data.csv',
        rowCount: mv.data.length,
        isValid: mvVal.isValid,
        missingColumns: mvVal.missingColumns,
      },
      demand_and_cost: {
        fileKey: 'demand_and_cost',
        fileName: 'demand_and_cost.csv',
        rowCount: demand.data.length,
        isValid: demandVal.isValid,
        missingColumns: demandVal.missingColumns,
      },
    };

    return {
      siteMaster: site.data,
      skuMaster: sku.data,
      movementTypeRef: ref.data,
      movementData: mv.data,
      demandAndCost: demand.data,
      statuses,
    };
  }, [siteMasterCsv, skuMasterCsv, movementTypeRefCsv, movementDataCsv, demandAndCostCsv]);

  // Main Calculation Execution for IAT
  const runCalculation = useCallback(() => {
    setIsCalculating(true);

    try {
      const calcOutput = calculateIAT({
        siteMaster: parsedData.siteMaster,
        skuMaster: parsedData.skuMaster,
        movementTypeRef: parsedData.movementTypeRef,
        movementData: parsedData.movementData,
        snapshotDateStr: snapshotDate,
      });

      setResults(calcOutput.results);
      setSummary(calcOutput.summary);
      setWindowStartDateStr(calcOutput.windowInfo.windowStartDateStr);
    } catch (err) {
      console.error('IAT Calculation error:', err);
    } finally {
      setIsCalculating(false);
    }
  }, [parsedData.siteMaster, parsedData.skuMaster, parsedData.movementTypeRef, parsedData.movementData, snapshotDate]);

  // Base filtered results before rule pill filtering (used as base for rule pills count)
  const baseFilteredResults = useMemo(() => {
    return results.filter((r) => {
      if (statusFilter === 'old' && !r.isOld) return false;
      if (statusFilter === 'new' && r.isOld) return false;
      if (siteFilter !== 'all' && r.site !== siteFilter) return false;
      if (regionFilter !== 'all' && r.regionId !== regionFilter) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        return (
          r.sku.toLowerCase().includes(query) ||
          r.site.toLowerCase().includes(query) ||
          r.skuDescription.toLowerCase().includes(query) ||
          r.siteDescription.toLowerCase().includes(query) ||
          r.gtin.toLowerCase().includes(query) ||
          r.segment.toLowerCase().includes(query) ||
          r.logicUsed.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [results, statusFilter, siteFilter, regionFilter, searchTerm]);

  // Final filtered results (including rule pill filter)
  const filteredResults = useMemo(() => {
    if (activeRuleFilter === 'all') return baseFilteredResults;
    return baseFilteredResults.filter((r) => r.logicRuleType === activeRuleFilter);
  }, [baseFilteredResults, activeRuleFilter]);

  // Dynamic summary calculation based on current visible/filtered dataset
  const liveSummary = useMemo(() => {
    return calculateSummaryFromResults(filteredResults, baseFilteredResults);
  }, [filteredResults, baseFilteredResults]);

  // Business Impact Calculation (Calculated directly and strictly from literal demand_and_cost.csv)
  const businessImpactOutput = useMemo(() => {
    return calculateBusinessImpact(parsedData.demandAndCost, results);
  }, [parsedData.demandAndCost, results]);

  // Auto-run calculation on dataset/date change
  useEffect(() => {
    runCalculation();
  }, [runCalculation]);

  // File Upload Handler (Replaces in-memory string state immediately)
  const handleFileUpload = (fileKey: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      switch (fileKey) {
        case 'site_master':
          setSiteMasterCsv(text);
          break;
        case 'sku_master':
          setSkuMasterCsv(text);
          break;
        case 'movement_type_reference':
          setMovementTypeRefCsv(text);
          break;
        case 'movement_data':
          setMovementDataCsv(text);
          break;
        case 'demand_and_cost':
          setDemandAndCostCsv(text);
          break;
      }
    };
    reader.readAsText(file);
  };

  // Load Benchmark Sample CSV Data
  const handleLoadSampleData = () => {
    setSiteMasterCsv(SAMPLE_SITE_MASTER_CSV);
    setSkuMasterCsv(SAMPLE_SKU_MASTER_CSV);
    setMovementTypeRefCsv(SAMPLE_MOVEMENT_TYPE_REF_CSV);
    setMovementDataCsv(SAMPLE_MOVEMENT_DATA_CSV);
    setDemandAndCostCsv(SAMPLE_DEMAND_AND_COST_CSV);
    setSnapshotDate('2026-08-10');
    setActiveRuleFilter('all');
  };

  // Reset to empty
  const handleReset = () => {
    setSiteMasterCsv('Site,PlantName,SiteLocationType,RegionId\n');
    setSkuMasterCsv('SKU,PartDescription,GTIN,RegionId,Segment,Category,Division\n');
    setMovementTypeRefCsv('RegionId,MovementType,MovementTypeDesc,IsGoodsReceipt\n');
    setMovementDataCsv('MovementId,MaterialNumber,PlantCode,RegionId,MovementType,PostingDate\n');
    setDemandAndCostCsv('SKU,Site,PartDescription,DailyDemandUnits,UnitCostUSD,BaselineLeadTimeDays\n');
    setResults([]);
  };

  // Download individual template CSV
  const handleDownloadSampleCsv = (fileKey: string) => {
    let content = '';
    let name = `${fileKey}.csv`;
    switch (fileKey) {
      case 'site_master':
        content = siteMasterCsv;
        name = 'site_master.csv';
        break;
      case 'sku_master':
        content = skuMasterCsv;
        name = 'sku_master.csv';
        break;
      case 'movement_type_reference':
        content = movementTypeRefCsv;
        name = 'movement_type_reference.csv';
        break;
      case 'movement_data':
        content = movementDataCsv;
        name = 'movement_data.csv';
        break;
      case 'demand_and_cost':
        content = demandAndCostCsv;
        name = 'demand_and_cost.csv';
        break;
    }

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export full analysis spreadsheet
  const handleExportExcel = () => {
    exportToExcel({
      results,
      summary,
      businessImpactRows: businessImpactOutput.rows,
      businessImpactSummary: businessImpactOutput.summary,
      snapshotDateStr: snapshotDate,
      windowStartDateStr,
      filename: `Supply_Chain_Analytics_${snapshotDate}.xlsx`,
    });
  };

  // Get active preview content
  const previewContent = useMemo(() => {
    switch (previewFileKey) {
      case 'site_master':
        return { filename: 'site_master.csv', content: siteMasterCsv };
      case 'sku_master':
        return { filename: 'sku_master.csv', content: skuMasterCsv };
      case 'movement_type_reference':
        return { filename: 'movement_type_reference.csv', content: movementTypeRefCsv };
      case 'movement_data':
        return { filename: 'movement_data.csv', content: movementDataCsv };
      case 'demand_and_cost':
        return { filename: 'demand_and_cost.csv', content: demandAndCostCsv };
      default:
        return { filename: '', content: '' };
    }
  }, [previewFileKey, siteMasterCsv, skuMasterCsv, movementTypeRefCsv, movementDataCsv, demandAndCostCsv]);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex flex-col pb-12">
      {/* Global Enterprise Header & Top Tabs */}
      <Header
        onLoadSampleData={handleLoadSampleData}
        onExportExcel={handleExportExcel}
        onReset={handleReset}
        onToggleHelp={() => setIsHelpOpen(true)}
        hasResults={results.length > 0}
        isCalculating={isCalculating}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Workspace Container */}
      <main className="max-w-[1600px] w-full mx-auto px-4 py-4 space-y-3 flex-1">
        {/* Source Data Management Section */}
        <CsvUploader
          statuses={parsedData.statuses}
          onFileUpload={handleFileUpload}
          onPreviewCsv={(key) => setPreviewFileKey(key)}
          onDownloadSampleCsv={handleDownloadSampleCsv}
          isExpanded={isCsvPanelsExpanded}
          onToggleExpand={() => setIsCsvPanelsExpanded(!isCsvPanelsExpanded)}
        />

        {/* Tab 1: IAT Calculation Results */}
        {activeTab === 'iat' && (
          <div className="space-y-3">
            {/* Snapshot Date Controls */}
            <SnapshotControls
              snapshotDate={snapshotDate}
              onSnapshotDateChange={(d) => setSnapshotDate(d)}
              windowStartDateStr={windowStartDateStr}
              onCalculate={runCalculation}
              isCalculating={isCalculating}
            />

            {/* Dynamic Reactive Summary Ribbon & Rule Filter Bar */}
            <SummaryCards
              summary={liveSummary}
              activeRuleFilter={activeRuleFilter}
              onSelectRuleFilter={(rule) => setActiveRuleFilter(rule)}
            />

            {/* Interactive Results Table */}
            <ResultsTable
              results={results}
              filteredResults={filteredResults}
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              siteFilter={siteFilter}
              onSiteFilterChange={setSiteFilter}
              regionFilter={regionFilter}
              onRegionFilterChange={setRegionFilter}
              onExportExcel={handleExportExcel}
              snapshotDateStr={snapshotDate}
              windowStartDateStr={windowStartDateStr}
            />

            {/* AI Insights Panel */}
            <AiInsightsChat
              parsedData={{
                siteMaster: parsedData.siteMaster,
                skuMaster: parsedData.skuMaster,
                movementTypeRef: parsedData.movementTypeRef,
                movementData: parsedData.movementData,
              }}
              snapshotDate={snapshotDate}
            />
          </div>
        )}

        {/* Tab 2: Business Impact & Cycle Stock Analysis */}
        {activeTab === 'business_impact' && (
          <div>
            <BusinessImpactView
              rows={businessImpactOutput.rows}
              summary={businessImpactOutput.summary}
              errors={businessImpactOutput.errors}
              onExportExcel={handleExportExcel}
              onUploadDemandCostCsv={(file) => handleFileUpload('demand_and_cost', file)}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <LogicHelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      <CsvViewerModal
        isOpen={!!previewFileKey}
        onClose={() => setPreviewFileKey(null)}
        fileKey={previewFileKey || ''}
        filename={previewContent.filename}
        csvContent={previewContent.content}
        onDownloadCsv={handleDownloadSampleCsv}
      />
    </div>
  );
}
