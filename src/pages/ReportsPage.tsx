import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import RiskBadge from '@/components/RiskBadge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FileText, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('genetic_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setReports(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const deleteReport = async (id: string) => {
    await supabase.from('genetic_reports').delete().eq('id', id);
    setReports(prev => prev.filter(r => r.id !== id));
    toast.success('Report deleted');
  };

  const deleteAll = async () => {
    if (!user) return;
    await supabase.from('genetic_reports').delete().eq('user_id', user.id);
    setReports([]);
    toast.success('All reports deleted');
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Reports</h1>
            <p className="text-muted-foreground mt-1">History of your genetic analyses</p>
          </div>
          {reports.length > 0 && (
            <Button variant="destructive" size="sm" onClick={deleteAll}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete All
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : reports.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No reports yet. Upload data and run an analysis first.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reports.map(report => (
              <Card key={report.id} className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-display font-semibold text-lg">{report.disease_type}</h3>
                        <RiskBadge level={report.risk_level} />
                      </div>
                      <p className="text-sm text-muted-foreground">{report.summary}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Score: {report.risk_score}%</span>
                        <span>{new Date(report.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteReport(report.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
