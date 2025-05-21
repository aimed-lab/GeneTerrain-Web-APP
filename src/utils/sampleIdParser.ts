// utils/sampleIdParser.ts
export function parseSampleIds(sampleIdString: string): string[] {
  if (!sampleIdString) return [];

  // Split by commas and trim each ID
  return sampleIdString.split(",").map((id) => id.trim());
}
