export interface GeneData {
  gene: string;
  variant: string;
  allele1: string;
  allele2: string;
  [key: string]: string;
}

export interface GeneRisk {
  gene: string;
  variant: string;
  riskContribution: number;
  status: 'normal' | 'carrier' | 'affected';
}

export interface AnalysisResult {
  riskLevel: 'Low' | 'Medium' | 'High';
  riskScore: number;
  geneAnalysis: GeneRisk[];
  summary: string;
}

// Known risk variants per disease (simplified for demo)
const DISEASE_RISK_GENES: Record<string, Record<string, { riskAlleles: string[]; weight: number }>> = {
  Diabetes: {
    TCF7L2: { riskAlleles: ['T'], weight: 1.5 },
    PPARG: { riskAlleles: ['G'], weight: 1.2 },
    KCNJ11: { riskAlleles: ['A'], weight: 1.3 },
    SLC30A8: { riskAlleles: ['C'], weight: 1.1 },
    CDKAL1: { riskAlleles: ['G'], weight: 1.0 },
    IGF2BP2: { riskAlleles: ['T'], weight: 0.9 },
    FTO: { riskAlleles: ['A'], weight: 1.4 },
    HNF1A: { riskAlleles: ['T'], weight: 1.6 },
  },
  Cancer: {
    BRCA1: { riskAlleles: ['T'], weight: 2.0 },
    BRCA2: { riskAlleles: ['A'], weight: 1.9 },
    TP53: { riskAlleles: ['G'], weight: 2.5 },
    APC: { riskAlleles: ['T'], weight: 1.7 },
    MLH1: { riskAlleles: ['C'], weight: 1.5 },
    PTEN: { riskAlleles: ['A'], weight: 1.8 },
    RB1: { riskAlleles: ['G'], weight: 1.3 },
    KRAS: { riskAlleles: ['T'], weight: 1.6 },
  },
  'Heart Disease': {
    APOE: { riskAlleles: ['E4'], weight: 1.8 },
    LDLR: { riskAlleles: ['T'], weight: 1.5 },
    PCSK9: { riskAlleles: ['A'], weight: 1.3 },
    LPA: { riskAlleles: ['G'], weight: 1.6 },
    SORT1: { riskAlleles: ['T'], weight: 1.1 },
    MTHFR: { riskAlleles: ['T'], weight: 1.2 },
    ACE: { riskAlleles: ['D'], weight: 1.4 },
    NOS3: { riskAlleles: ['A'], weight: 1.0 },
  },
  Alzheimer: {
    APOE: { riskAlleles: ['E4'], weight: 3.0 },
    APP: { riskAlleles: ['T'], weight: 2.0 },
    PSEN1: { riskAlleles: ['A'], weight: 2.5 },
    PSEN2: { riskAlleles: ['G'], weight: 2.0 },
    TREM2: { riskAlleles: ['T'], weight: 1.5 },
    CLU: { riskAlleles: ['C'], weight: 1.0 },
    SORL1: { riskAlleles: ['A'], weight: 1.3 },
    BIN1: { riskAlleles: ['G'], weight: 1.1 },
  },
};

export const DISEASES = Object.keys(DISEASE_RISK_GENES);

/** Generate sample CSV content for a given disease with realistic risk data */
export function generateSampleCSV(disease: string): string {
  const genes = DISEASE_RISK_GENES[disease];
  if (!genes) return '';

  const headers = 'Gene,Variant,Allele1,Allele2';
  const rows = Object.entries(genes).map(([gene, info], i) => {
    const variant = `rs${100000 + i * 1117}`;
    // Alternate between affected, carrier, and normal for variety
    const mod = i % 3;
    if (mod === 0) {
      // affected: both alleles are risk
      return `${gene},${variant},${info.riskAlleles[0]},${info.riskAlleles[0]}`;
    } else if (mod === 1) {
      // carrier: one risk allele
      const safeAllele = info.riskAlleles[0] === 'A' ? 'G' : 'A';
      return `${gene},${variant},${info.riskAlleles[0]},${safeAllele}`;
    } else {
      // normal: no risk alleles
      const safeAllele = info.riskAlleles[0] === 'A' ? 'G' : 'A';
      return `${gene},${variant},${safeAllele},${safeAllele}`;
    }
  });

  return [headers, ...rows].join('\n');
}

export function parseCSV(text: string): GeneData[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = line.split(',').map(v => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || '';
    });
    return {
      gene: row.gene || row.gene_name || '',
      variant: row.variant || row.rsid || row.snp || '',
      allele1: row.allele1 || row.allele_1 || row.ref || '',
      allele2: row.allele2 || row.allele_2 || row.alt || '',
      ...row,
    };
  }).filter(r => r.gene);
}

export function analyzeGenetics(data: GeneData[], disease: string): AnalysisResult {
  const riskGenes = DISEASE_RISK_GENES[disease] || {};
  let totalScore = 0;
  let maxPossible = 0;

  const geneAnalysis: GeneRisk[] = data.map(row => {
    const geneInfo = riskGenes[row.gene.toUpperCase()] || riskGenes[row.gene];
    
    if (!geneInfo) {
      return { gene: row.gene, variant: row.variant, riskContribution: 0, status: 'normal' as const };
    }

    maxPossible += geneInfo.weight * 2;
    const a1Risk = geneInfo.riskAlleles.includes(row.allele1) ? 1 : 0;
    const a2Risk = geneInfo.riskAlleles.includes(row.allele2) ? 1 : 0;
    const contribution = (a1Risk + a2Risk) * geneInfo.weight;
    totalScore += contribution;

    const status = a1Risk + a2Risk === 2 ? 'affected' : a1Risk + a2Risk === 1 ? 'carrier' : 'normal';
    return { gene: row.gene, variant: row.variant, riskContribution: Math.round(contribution * 100) / 100, status };
  });

  if (maxPossible === 0) maxPossible = 1;
  const normalizedScore = Math.round((totalScore / maxPossible) * 100);
  const riskLevel = normalizedScore >= 60 ? 'High' : normalizedScore >= 30 ? 'Medium' : 'Low';

  const affectedGenes = geneAnalysis.filter(g => g.status !== 'normal');
  const summary = affectedGenes.length > 0
    ? `Found ${affectedGenes.length} gene(s) with risk variants for ${disease}. Overall risk score: ${normalizedScore}%.`
    : `No significant risk variants detected for ${disease}. Overall risk score: ${normalizedScore}%.`;

  return { riskLevel, riskScore: normalizedScore, geneAnalysis, summary };
}
