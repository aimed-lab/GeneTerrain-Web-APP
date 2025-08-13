// Define all shared types in one place
export interface Point {
  x: number;
  y: number;
  geneId: string;
  geneName: string;
  pathways: string[];
  description: string;
  value: number;
}

export interface Sample {
  sampleid?: string;
  id: string;
  name: string;
  description: string;
  condition: string;
  date: string;
  points: Point[];
  // Add these optional fields for enhanced display
  project?: string;
  protocol?: string;
  organism?: string;
  platform?: string;
  notes?: string;
  // Add metadata fields
  age?: number;
  gender?: string;
  subtype?: string;
  grade?: string;
  idh_status?: string;
  mgmt_status?: string;
}

export interface CancerGroup {
  id: string;
  name: string;
  description: string;
}

export interface Dataset {
  id: string;
  name: string;
  description: string;
  samples: Sample[];
  cancerGroup?: string; // Add cancer group support
}
