
import { DataRow } from "./types";

export interface ColumnStats {
    min?: number;
    max?: number;
    mean?: number;
    median?: number;
    uniqueCount: number;
    missingValues: number;
    type: 'numeric' | 'categorical';
    topValues?: { value: string; count: number }[];
}

export interface DatasetProfile {
    rows: number;
    cols: number;
    columnStats: Record<string, ColumnStats>;
}

export const processJSONData = (data: any[]): { headers: string[]; data: DataRow[]; profile: DatasetProfile } => {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Invalid JSON data: Expected a non-empty array of objects.");
    }

    const allKeys = new Set<string>();
    data.forEach(item => {
        Object.keys(item).forEach(key => allKeys.add(key));
    });
    const headers = Array.from(allKeys);

    const columnStats: Record<string, ColumnStats> = {};
    headers.forEach(header => {
        const values = data.map(r => r[header]).filter(v => v !== null && v !== undefined && v !== '');
        const numValues = values.filter(v => typeof v === 'number') as number[];
        const isNumeric = numValues.length > values.length * 0.6;
        const uniqueSet = new Set(values);

        const stats: ColumnStats = {
            uniqueCount: uniqueSet.size,
            missingValues: data.length - values.length,
            type: isNumeric ? 'numeric' : 'categorical'
        };

        if (isNumeric && numValues.length > 0) {
            const sorted = [...numValues].sort((a, b) => a - b);
            stats.min = sorted[0];
            stats.max = sorted[sorted.length - 1];
            stats.mean = numValues.reduce((a, b) => a + b, 0) / numValues.length;
            stats.median = sorted[Math.floor(sorted.length / 2)];
        } else {
            const counts: Record<string, number> = {};
            values.forEach(v => {
                const s = String(v);
                counts[s] = (counts[s] || 0) + 1;
            });
            const limit = uniqueSet.size < 50 ? uniqueSet.size : 5;
            stats.topValues = Object.entries(counts)
                .map(([value, count]) => ({ value, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, limit);
        }
        columnStats[header] = stats;
    });

    return { headers, data, profile: { rows: data.length, cols: headers.length, columnStats } };
};

export const processClinicalGenomicData = (json: any): { headers: string[]; data: DataRow[]; profile: DatasetProfile } => {
    const clinical: DataRow[] = json.clinical_data || [];
    const genomic: DataRow[] = json.gene_expression || [];

    const patientData: DataRow[] = clinical.map((p: DataRow) => ({
        ...p,
        gene_symbol: "_CLINICAL_ONLY_",
        value: null
    }));

    const genomicData: DataRow[] = genomic.map((g: DataRow) => {
        const patient = clinical.find((p: DataRow) => p.sampleid === g.sampleid) || {};
        return { ...patient, ...g };
    });

    return processJSONData([...patientData, ...genomicData]);
};
