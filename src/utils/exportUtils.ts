import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ReconciliationResult } from '@/types/reconciliation';
import { ReconciliationResultSummary } from '@/types/history';

// Helper for flattening rows for export
const flattenRow = (row: any, prefix: string) => {
  if (!row) return {};
  const flattened: any = {};
  Object.entries(row).forEach(([key, value]) => {
    if (key !== '__line') {
      flattened[`${prefix}_${key}`] = value;
    }
  });
  return flattened;
};

export const computeResultStats = (results: ReconciliationResult[]): ReconciliationResultSummary => {
  const total = results.length;
  const matched = results.filter(r => r.status === 'matched').length;
  const unmatchedSource = results.filter(r => r.status === 'unmatched-source').length;
  const unmatchedTarget = results.filter(r => r.status === 'unmatched-target').length;
  const discrepancies = results.filter(r => r.status === 'discrepancy').length;
  const matchRate = total > 0 ? (matched / total * 100).toFixed(1) : '0';

  return { total, matched, unmatchedSource, unmatchedTarget, discrepancies, matchRate };
};

/**
 * Builds the reconciliation report workbook (Summary / All Results / Discrepancies /
 * Source Only / Target Only sheets). Shared by the in-browser "Export Excel" button
 * and the history-saving flow, so both produce an identical output file.
 */
export const buildReconciliationWorkbook = (
  results: ReconciliationResult[],
  sourceFileName: string,
  targetFileName: string
): XLSX.WorkBook => {
  const stats = computeResultStats(results);
  const workbook = XLSX.utils.book_new();

  // 1. Summary Sheet
  const summaryData = [
    ['Reconciliation Report Summary'],
    ['Generated At', format(new Date(), 'yyyy-MM-dd HH:mm:ss')],
    [''],
    ['File Information'],
    ['Source File', sourceFileName],
    ['Target File', targetFileName],
    [''],
    ['Reconciliation Statistics'],
    ['Total Records', stats.total],
    ['Matched', stats.matched],
    ['Unmatched Source', stats.unmatchedSource],
    ['Unmatched Target', stats.unmatchedTarget],
    ['Discrepancies', stats.discrepancies],
    ['Match Rate', `${stats.matchRate}%`],
    [''],
    ['How to read this report'],
    ['Status', 'Meaning'],
    ['Matched', 'Source and Target records match perfectly based on your rules.'],
    ['Discrepancy', 'Source and Target records match but have differences in mapped fields.'],
    ['Unmatched Source', 'Record exists in Source file but no matching record found in Target.'],
    ['Unmatched Target', 'Record exists in Target file but no matching record found in Source.']
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // 2. All Results Sheet
  const allResultsData = results.map(r => ({
    Status: r.status,
    'Src Line': r.sourceLine || '',
    'Tgt Line': r.targetLine || '',
    ...flattenRow(r.sourceRow, 'Src'),
    ...flattenRow(r.targetRow, 'Tgt'),
    Issues: r.discrepancies?.join(', ') || ''
  }));
  const allResultsSheet = XLSX.utils.json_to_sheet(allResultsData);
  XLSX.utils.book_append_sheet(workbook, allResultsSheet, 'All Results');

  // 3. Discrepancies Sheet
  const discrepancyData = results.filter(r => r.status === 'discrepancy').map(r => ({
    'Src Line': r.sourceLine,
    'Tgt Line': r.targetLine,
    ...flattenRow(r.sourceRow, 'Src'),
    ...flattenRow(r.targetRow, 'Tgt'),
    Issues: r.discrepancies?.join(', ')
  }));
  if (discrepancyData.length > 0) {
    const discrepancySheet = XLSX.utils.json_to_sheet(discrepancyData);
    XLSX.utils.book_append_sheet(workbook, discrepancySheet, 'Discrepancies');
  }

  // 4. Unmatched Sheets
  const sourceOnly = results.filter(r => r.status === 'unmatched-source').map(r => ({
    Line: r.sourceLine,
    ...flattenRow(r.sourceRow, 'Data')
  }));
  if (sourceOnly.length > 0) {
    const sourceOnlySheet = XLSX.utils.json_to_sheet(sourceOnly);
    XLSX.utils.book_append_sheet(workbook, sourceOnlySheet, 'Source Only (Missing in Target)');
  }

  const targetOnly = results.filter(r => r.status === 'unmatched-target').map(r => ({
    Line: r.targetLine,
    ...flattenRow(r.targetRow, 'Data')
  }));
  if (targetOnly.length > 0) {
    const targetOnlySheet = XLSX.utils.json_to_sheet(targetOnly);
    XLSX.utils.book_append_sheet(workbook, targetOnlySheet, 'Target Only (Missing in Source)');
  }

  return workbook;
};

export const downloadReconciliationWorkbook = (
  results: ReconciliationResult[],
  sourceFileName: string,
  targetFileName: string
) => {
  const workbook = buildReconciliationWorkbook(results, sourceFileName, targetFileName);
  XLSX.writeFile(workbook, `Reconciliation_Report_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`);
};

/** Same workbook, but as a Blob (for uploading to storage instead of downloading). */
export const reconciliationWorkbookToBlob = (
  results: ReconciliationResult[],
  sourceFileName: string,
  targetFileName: string
): Blob => {
  const workbook = buildReconciliationWorkbook(results, sourceFileName, targetFileName);
  const arrayBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};
