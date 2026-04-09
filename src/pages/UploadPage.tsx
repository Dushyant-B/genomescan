import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RiskBadge from '@/components/RiskBadge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DISEASES, parseCSV, analyzeGenetics } from '@/lib/geneticAnalysis';
import { Upload, Trash2, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { AnalysisResult } from '@/lib/geneticAnalysis';

export default function UploadPage() {
  const { user } = useAuth();
  const [disease, setDisease] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [uploads, setUploads] = useState<any[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(true);

  const fetchUploads = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('genetic_uploads')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setUploads(data || []);
    setLoadingUploads(false);
  }, [user]);

  useEffect(() => { fetchUploads(); }, [fetchUploads]);

  const handleUpload = async () => {
    if (!file || !disease || !user) {
      toast.error('Please select a disease and a CSV file');
      return;
    }
    setUploading(true);
    setResult(null);

    try {
      // Read and parse CSV
      const text = await file.text();
      const geneData = parseCSV(text);
      if (geneData.length === 0) {
        toast.error('No valid gene data found. Ensure CSV has columns: Gene, Variant, Allele1, Allele2');
        setUploading(false);
        return;
      }

      // Upload file to storage
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: storageError } = await supabase.storage.from('genetic-files').upload(filePath, file);
      if (storageError) throw storageError;

      // Create upload record
      const { data: uploadData, error: uploadError } = await supabase
        .from('genetic_uploads')
        .insert({ user_id: user.id, file_name: file.name, file_size: file.size, file_path: filePath, disease_type: disease })
        .select()
        .single();
      if (uploadError) throw uploadError;

      // Analyze
      const analysis = analyzeGenetics(geneData, disease);
      setResult(analysis);

      // Save report
      await supabase.from('genetic_reports').insert({
        user_id: user.id,
        upload_id: uploadData.id,
        disease_type: disease,
        risk_level: analysis.riskLevel,
        risk_score: analysis.riskScore,
        gene_analysis: analysis.geneAnalysis as any,
        summary: analysis.summary,
      });

      // Update upload status
      await supabase.from('genetic_uploads').update({ status: 'completed' }).eq('id', uploadData.id);

      toast.success('Analysis complete!');
      fetchUploads();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleClearAll = async () => {
    if (!user) return;
    await supabase.from('genetic_reports').delete().eq('user_id', user.id);
    await supabase.from('genetic_uploads').delete().eq('user_id', user.id);
    setUploads([]);
    setResult(null);
    toast.success('All data cleared');
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Upload Genetic Data</h1>
            <p className="text-muted-foreground mt-1">Upload CSV files for risk analysis</p>
          </div>
          {uploads.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleClearAll}>
              <Trash2 className="h-4 w-4 mr-2" /> Clear All Data
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Form */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display">New Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Disease</label>
                <Select value={disease} onValueChange={setDisease}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Choose a disease..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DISEASES.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {disease && (
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-1 p-0 h-auto text-xs"
                    onClick={() => {
                      const csv = generateSampleCSV(disease);
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `sample_${disease.replace(/\s+/g, '_').toLowerCase()}_genes.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download sample CSV for {disease}
                  </Button>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Upload CSV File</label>
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-muted/30">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    {file ? file.name : 'Click to select CSV file'}
                  </span>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              <Button
                className="w-full h-12 gradient-primary text-primary-foreground font-semibold"
                onClick={handleUpload}
                disabled={uploading || !file || !disease}
              >
                {uploading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Upload className="h-5 w-5 mr-2" />}
                {uploading ? 'Analyzing...' : 'Upload & Analyze'}
              </Button>
            </CardContent>
          </Card>

          {/* Result */}
          {result && (
            <Card className={`glass-card ${
              result.riskLevel === 'Low' ? 'risk-glow-low' :
              result.riskLevel === 'Medium' ? 'risk-glow-medium' : 'risk-glow-high'
            }`}>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Analysis Result
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-4">
                  <RiskBadge level={result.riskLevel} size="lg" />
                  <p className="text-4xl font-display font-bold mt-4">{result.riskScore}%</p>
                  <p className="text-sm text-muted-foreground mt-1">Risk Score</p>
                </div>
                <p className="text-sm text-muted-foreground">{result.summary}</p>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Gene Breakdown</p>
                  {result.geneAnalysis.filter(g => g.status !== 'normal').length === 0 ? (
                    <p className="text-sm text-muted-foreground">No risk variants detected</p>
                  ) : (
                    result.geneAnalysis.filter(g => g.status !== 'normal').map(g => (
                      <div key={g.gene} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
                        <div>
                          <span className="font-medium">{g.gene}</span>
                          <span className="text-muted-foreground ml-2">{g.variant}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={g.status === 'affected' ? 'text-risk-high' : 'text-risk-medium'}>
                            {g.status}
                          </span>
                          <span className="text-muted-foreground">+{g.riskContribution}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Upload History */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Upload History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingUploads ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : uploads.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No uploads yet</p>
            ) : (
              <div className="space-y-2">
                {uploads.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{u.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {u.disease_type} — {new Date(u.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {u.status === 'completed' ? (
                        <CheckCircle2 className="h-4 w-4 text-risk-low" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-risk-medium" />
                      )}
                      <span className="text-xs text-muted-foreground">{u.status}</span>
                    </div>
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
