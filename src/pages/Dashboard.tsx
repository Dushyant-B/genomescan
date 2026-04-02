import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import RiskBadge from '@/components/RiskBadge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ShieldCheck, AlertTriangle, ShieldAlert, Upload, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Stats {
  low: number;
  medium: number;
  high: number;
  totalUploads: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ low: 0, medium: 0, high: 0, totalUploads: 0 });
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [reportsRes, uploadsRes] = await Promise.all([
        supabase.from('genetic_reports').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('genetic_uploads').select('id').eq('user_id', user.id),
      ]);

      const reports = reportsRes.data || [];
      setStats({
        low: reports.filter(r => r.risk_level === 'Low').length,
        medium: reports.filter(r => r.risk_level === 'Medium').length,
        high: reports.filter(r => r.risk_level === 'High').length,
        totalUploads: uploadsRes.data?.length || 0,
      });
      setRecentReports(reports.slice(0, 5));
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const summaryCards = [
    { label: 'Low Risk', value: stats.low, icon: ShieldCheck, colorClass: 'text-risk-low', glowClass: 'risk-glow-low' },
    { label: 'Medium Risk', value: stats.medium, icon: AlertTriangle, colorClass: 'text-risk-medium', glowClass: 'risk-glow-medium' },
    { label: 'High Risk', value: stats.high, icon: ShieldAlert, colorClass: 'text-risk-high', glowClass: 'risk-glow-high' },
    { label: 'Total Uploads', value: stats.totalUploads, icon: Upload, colorClass: 'text-primary', glowClass: '' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your genetic risk analyses</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {summaryCards.map(({ label, value, icon: Icon, colorClass, glowClass }) => (
            <Card key={label} className={`glass-card ${glowClass}`}>
              <CardContent className="p-6">
                {loading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className="text-3xl font-display font-bold mt-1">{value}</p>
                    </div>
                    <Icon className={`h-10 w-10 ${colorClass} opacity-80`} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Activity className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : recentReports.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No analyses yet. Upload genetic data to get started.</p>
            ) : (
              <div className="space-y-3">
                {recentReports.map(report => (
                  <div key={report.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{report.disease_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(report.created_at).toLocaleDateString()} — Score: {report.risk_score}%
                      </p>
                    </div>
                    <RiskBadge level={report.risk_level} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
