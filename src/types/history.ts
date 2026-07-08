// Types for reconciliation history stored in Supabase

import { ColumnMapping, VirtualField } from './reconciliation';
import { TransformationPipeline } from './transformations';
import { SortConfiguration } from '@/components/SortConfigurationPanel';

export interface ReconciliationResultSummary {
  total: number;
  matched: number;
  unmatchedSource: number;
  unmatchedTarget: number;
  discrepancies: number;
  matchRate: string;
}

export interface ReconciliationConfigSnapshot {
  mappings: ColumnMapping[];
  sourceVirtualFields: VirtualField[];
  targetVirtualFields: VirtualField[];
  transformations: TransformationPipeline[];
  sortConfiguration: SortConfiguration;
}

export interface ReconciliationHistoryRecord {
  id: string;
  user_id: string;
  created_at: string;
  source_file_name: string;
  target_file_name: string;
  source_file_path: string | null;
  target_file_path: string | null;
  output_file_path: string | null;
  config: ReconciliationConfigSnapshot;
  result_summary: ReconciliationResultSummary;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}
