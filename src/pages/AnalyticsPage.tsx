import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3, PieChartIcon, TrendingUp, Loader2 } from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';

interface GeneAnalysisItem {
  gene: string;
  riskContribution: number;
  status: string;
}

const RISK_COLORS = {
  Low: 'hsl(142, 71%, 45%)',
  Medium: 'hsl(38, 92%, 50%)',
  High: 'hsl(0, 72%, 51%)',
};

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('genetic_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setReports(data || []);
        setLoading(false);
      });
  }, [user]);

  // Risk distribution
  const riskDist = [
    { name: 'Low', value: reports.filter(r => r.risk_level === 'Low').length },
    { name: 'Medium', value: reports.filter(r => r.risk_level === 'Medium').length },
    { name: 'High', value: reports.filter(r => r.risk_level === 'High').length },
  ].filter(d => d.value > 0);

  // Gene-wise analysis (aggregate across all reports)
  const geneMap = new Map<string, { total: number; count: number }>();
  reports.forEach(r => {
    const analysis = r.gene_analysis as Json;
    if (Array.isArray(analysis)) {
      (analysis as unknown as GeneAnalysisItem[]).forEach((g) => {
        if (g.riskContribution > 0) {
          const existing = geneMap.get(g.gene) || { total: 0, count: 0 };
          geneMap.set(g.gene, { total: existing.total + g.riskContribution, count: existing.count + 1 });
        }
      });
    }
  });
  const geneData = Array.from(geneMap.entries())
    .map(([gene, { total, count }]) => ({ gene, avgRisk: Math.round((total / count) * 100) / 100 }))
    .sort((a, b) => b.avgRisk - a.avgRisk)
    .slice(0, 10);

  // Trend data
  const trendData = reports.map(r => ({
    date: new Date(r.created_at).toLocaleDateString(),
    score: r.risk_score,
    disease: r.disease_type,
  }));

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">Visual insights from your genetic analyses</p>
        </div>

        {reports.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-16 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No data yet. Upload and analyze genetic data to see charts.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Risk Distribution Pie */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-primary" />
                  Risk Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={riskDist} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {riskDist.map((entry) => (
                        <Cell key={entry.name} fill={RISK_COLORS[entry.name as keyof typeof RISK_COLORS]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gene-wise Bar Chart */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Gene Risk Contributions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {geneData.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No risk genes detected yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={geneData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" />
                      <XAxis dataKey="gene" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="avgRisk" fill="hsl(160, 84%, 39%)" radius={[6, 6, 0, 0]} name="Avg Risk Score" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Trend */}
            <Card className="glass-card lg:col-span-2">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Risk Score Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip content={({ payload, label }) => {
                      if (!payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-card p-3 rounded-lg shadow-lg border text-sm">
                          <p className="font-medium">{label}</p>
                          <p className="text-muted-foreground">{d.disease}: {d.score}%</p>
                        </div>
                      );
                    }} />
                    <Bar dataKey="score" fill="hsl(260, 60%, 58%)" radius={[6, 6, 0, 0]} name="Risk Score" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
