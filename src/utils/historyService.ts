import { supabase, STORAGE_BUCKET } from '@/lib/supabase';
import { ReconciliationResult } from '@/types/reconciliation';
import { ReconciliationConfigSnapshot, ReconciliationHistoryRecord } from '@/types/history';
import { computeResultStats, reconciliationWorkbookToBlob } from '@/utils/exportUtils';

interface SaveHistoryArgs {
  userId: string;
  sourceFile: File | null;
  targetFile: File | null;
  sourceFileName: string;
  targetFileName: string;
  results: ReconciliationResult[];
  config: ReconciliationConfigSnapshot;
}

const uploadFile = async (path: string, file: File | Blob) => {
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    upsert: true,
  });
  if (error) throw error;
  return path;
};

/**
 * Saves a completed reconciliation run: uploads the source file, target file, and
 * generated output workbook to Supabase Storage, then inserts a row recording the
 * config used, the result summary, and the storage paths.
 */
export const saveReconciliationHistory = async ({
  userId,
  sourceFile,
  targetFile,
  sourceFileName,
  targetFileName,
  results,
  config,
}: SaveHistoryArgs): Promise<{ error: string | null }> => {
  try {
    const historyId = crypto.randomUUID();
    const folder = `${userId}/${historyId}`;

    let sourceFilePath: string | null = null;
    let targetFilePath: string | null = null;
    let outputFilePath: string | null = null;

    if (sourceFile) {
      sourceFilePath = await uploadFile(`${folder}/source_${sourceFile.name}`, sourceFile);
    }
    if (targetFile) {
      targetFilePath = await uploadFile(`${folder}/target_${targetFile.name}`, targetFile);
    }

    const outputBlob = reconciliationWorkbookToBlob(results, sourceFileName, targetFileName);
    outputFilePath = await uploadFile(`${folder}/output.xlsx`, outputBlob);

    const resultSummary = computeResultStats(results);

    const { error } = await supabase.from('reconciliation_history').insert({
      id: historyId,
      user_id: userId,
      source_file_name: sourceFileName,
      target_file_name: targetFileName,
      source_file_path: sourceFilePath,
      target_file_path: targetFilePath,
      output_file_path: outputFilePath,
      config,
      result_summary: resultSummary,
    });

    if (error) throw error;

    return { error: null };
  } catch (err: any) {
    return { error: err?.message || 'Failed to save reconciliation history' };
  }
};

export const listReconciliationHistory = async (
  userId: string
): Promise<{ data: ReconciliationHistoryRecord[]; error: string | null }> => {
  const { data, error } = await supabase
    .from('reconciliation_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data as ReconciliationHistoryRecord[]) || [], error: null };
};

export const deleteReconciliationHistory = async (
  record: ReconciliationHistoryRecord
): Promise<{ error: string | null }> => {
  const paths = [record.source_file_path, record.target_file_path, record.output_file_path].filter(
    Boolean
  ) as string[];

  if (paths.length > 0) {
    await supabase.storage.from(STORAGE_BUCKET).remove(paths);
  }

  const { error } = await supabase.from('reconciliation_history').delete().eq('id', record.id);
  return { error: error?.message || null };
};

export const getSignedDownloadUrl = async (path: string): Promise<string | null> => {
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 60 * 5);
  if (error || !data) return null;
  return data.signedUrl;
};
