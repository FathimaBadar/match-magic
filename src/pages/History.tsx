import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Download, Trash2, FileSpreadsheet, History as HistoryIcon, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import {
  listReconciliationHistory,
  deleteReconciliationHistory,
  getSignedDownloadUrl,
} from '@/utils/historyService';
import { ReconciliationHistoryRecord } from '@/types/history';
import { toast } from '@/hooks/use-toast';

const StatBadge = ({ label, value, tone }: { label: string; value: number; tone: 'success' | 'destructive' | 'warning' }) => {
  const toneClasses = {
    success: 'bg-success/10 text-success border-success/20',
    destructive: 'bg-destructive/10 text-destructive border-destructive/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
  };
  return (
    <Badge variant="outline" className={toneClasses[tone]}>
      {value} {label}
    </Badge>
  );
};

const HistoryPage = () => {
  const { user, profile } = useAuth();
  const [records, setRecords] = useState<ReconciliationHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ReconciliationHistoryRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await listReconciliationHistory(user.id);
    if (error) {
      toast({ title: 'Could not load history', description: error, variant: 'destructive' });
    } else {
      setRecords(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleDownload = async (path: string | null, label: string) => {
    if (!path) return;
    setDownloadingPath(path);
    const url = await getSignedDownloadUrl(path);
    setDownloadingPath(null);
    if (!url) {
      toast({ title: 'Download failed', description: `Could not generate a link for ${label}.`, variant: 'destructive' });
      return;
    }
    window.open(url, '_blank');
  };

  const handleDelete = async (record: ReconciliationHistoryRecord) => {
    setDeletingId(record.id);
    const { error } = await deleteReconciliationHistory(record);
    setDeletingId(null);
    if (error) {
      toast({ title: 'Delete failed', description: error, variant: 'destructive' });
      return;
    }
    setRecords((prev) => prev.filter((r) => r.id !== record.id));
    toast({ title: 'Deleted', description: 'Reconciliation record removed from history.' });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center gap-3">
          <HistoryIcon className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reconciliation History</h1>
            <p className="text-sm text-muted-foreground">
              {profile?.email || user?.email} &middot; {records.length} saved run{records.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : records.length === 0 ? (
          <Card className="p-12 text-center">
            <FileSpreadsheet className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">No reconciliations saved yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Run a reconciliation from the home page and it will automatically show up here.
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Source File</TableHead>
                  <TableHead>Target File</TableHead>
                  <TableHead>Results</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {format(new Date(record.created_at), 'yyyy-MM-dd HH:mm')}
                    </TableCell>
                    <TableCell className="text-sm">{record.source_file_name}</TableCell>
                    <TableCell className="text-sm">{record.target_file_name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <StatBadge label="matched" value={record.result_summary?.matched ?? 0} tone="success" />
                        <StatBadge
                          label="unmatched"
                          value={(record.result_summary?.unmatchedSource ?? 0) + (record.result_summary?.unmatchedTarget ?? 0)}
                          tone="destructive"
                        />
                        <StatBadge label="issues" value={record.result_summary?.discrepancies ?? 0} tone="warning" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setDetail(record)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!record.output_file_path || downloadingPath === record.output_file_path}
                          onClick={() => handleDownload(record.output_file_path, 'output file')}
                        >
                          {downloadingPath === record.output_file_path ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={deletingId === record.id}
                          onClick={() => handleDelete(record)}
                        >
                          {deletingId === record.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reconciliation Details</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{format(new Date(detail.created_at), 'yyyy-MM-dd HH:mm:ss')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Match Rate</p>
                  <p className="font-medium">{detail.result_summary?.matchRate ?? 0}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Source File</p>
                  <p className="font-medium">{detail.source_file_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Target File</p>
                  <p className="font-medium">{detail.target_file_name}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <StatBadge label="matched" value={detail.result_summary?.matched ?? 0} tone="success" />
                <StatBadge label="unmatched source" value={detail.result_summary?.unmatchedSource ?? 0} tone="destructive" />
                <StatBadge label="unmatched target" value={detail.result_summary?.unmatchedTarget ?? 0} tone="destructive" />
                <StatBadge label="discrepancies" value={detail.result_summary?.discrepancies ?? 0} tone="warning" />
              </div>

              <div>
                <p className="text-muted-foreground mb-2">Column Mappings ({detail.config?.mappings?.length ?? 0})</p>
                <div className="space-y-1">
                  {(detail.config?.mappings || []).map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1">
                      <span className="font-mono">{Array.isArray(m.sourceColumn) ? m.sourceColumn.join(' + ') : m.sourceColumn}</span>
                      <span className="text-muted-foreground">&rarr;</span>
                      <span className="font-mono">{m.targetColumn}</span>
                      <Badge variant="outline" className="ml-auto">{m.matchType}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-muted-foreground mb-2">Sort / Match Configuration</p>
                <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto">
                  {JSON.stringify(detail.config?.sortConfiguration, null, 2)}
                </pre>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!detail.source_file_path}
                  onClick={() => handleDownload(detail.source_file_path, 'source file')}
                >
                  <Download className="w-4 h-4 mr-2" /> Source File
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!detail.target_file_path}
                  onClick={() => handleDownload(detail.target_file_path, 'target file')}
                >
                  <Download className="w-4 h-4 mr-2" /> Target File
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!detail.output_file_path}
                  onClick={() => handleDownload(detail.output_file_path, 'output file')}
                >
                  <Download className="w-4 h-4 mr-2" /> Output Report
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HistoryPage;
