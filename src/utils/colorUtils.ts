/**
 * Convert hex color to RGB object
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  // Default to black if invalid hex
  if (!hex || hex === "undefined") {
    return { r: 0, g: 0, b: 0 };
  }

  // Remove # if present
  hex = hex.replace(/^#/, "");

  // Handle shorthand hex (e.g. #FFF)
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  // Parse the hex values
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return { r, g, b };
}

/**
 * Convert hex color to RGB array normalized to 0-1 range for WebGL
 */
export function hexToRgbArray(hex: string): [number, number, number] {
  const { r, g, b } = hexToRgb(hex);
  return [r / 255, g / 255, b / 255];
}

/**
 * Get spectral color from value, using theme colors
 */
export function getSpectralColorFromTheme(
  value: number,
  expressionLow: string,
  expressionMed: string,
  expressionHigh: string
): string {
  if (value <= -1) return expressionLow;
  if (value >= 1) return expressionHigh;

  // Linear interpolation between colors
  if (value < 0) {
    // Interpolate between low and medium
    const t = value + 1; // Map [-1,0] to [0,1]
    const lowRgb = hexToRgb(expressionLow);
    const medRgb = hexToRgb(expressionMed);

    const r = Math.round(lowRgb.r + t * (medRgb.r - lowRgb.r));
    const g = Math.round(lowRgb.g + t * (medRgb.g - lowRgb.g));
    const b = Math.round(lowRgb.b + t * (medRgb.b - lowRgb.b));

    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Interpolate between medium and high
    const t = value; // Map [0,1] to [0,1]
    const medRgb = hexToRgb(expressionMed);
    const highRgb = hexToRgb(expressionHigh);

    const r = Math.round(medRgb.r + t * (highRgb.r - medRgb.r));
    const g = Math.round(medRgb.g + t * (medRgb.g - medRgb.g));
    const b = Math.round(medRgb.b + t * (highRgb.b - medRgb.b));

    return `rgb(${r}, ${g}, ${b})`;
  }
}
