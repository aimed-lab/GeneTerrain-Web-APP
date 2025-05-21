/**
 * Application Configuration
 *
 * This file centralizes all configuration values used throughout the application.
 * For production deployment, consider using environment variables and a .env file.
 */

// API endpoints
export const API_CONFIG = {
  // Base API URL - change this to your production API when ready
  baseUrl: "https://api.geneterrain.org",

  // Specific endpoints
  endpoints: {
    datasets: "/datasets",
    samples: "/samples",
    visualization: "/visualization",
    auth: "/auth",
  },

  // API keys (consider using environment variables in production)
  apiKey: "YOUR_API_KEY_HERE",

  // Timeouts in milliseconds
  timeout: 30000, // 30 seconds

  // Mock data configuration
  useMockData: true, // Set to false in production
  mockDatasetCount: 5,
};

// UI Configuration
export const UI_CONFIG = {
  // Theme colors references
  colors: {
    primary: "geneTerrain.primary",
    secondary: "geneTerrain.secondary",
    accent1: "geneTerrain.accent1",
    accent2: "geneTerrain.accent2",
    neutral: "geneTerrain.neutral",
    gray: "geneTerrain.gray",
  },

  // Actual color values for direct reference
  colorValues: {
    primary: "#1E6B52", // dark green
    secondary: "#295135", // darker green
    accent1: "#80BC00", // lime green
    accent2: "#FFD400", // yellow
    neutral: "#AA9767", // beige
    gray: "#808285", // gray

    // Visual contexts
    visualizationBg: "#213E2A", // A slightly lighter version of secondary for visualization
    visualizationBorder: "#80BC00", // lime green accent for borders

    // Lighter backgrounds for content areas
    contentBg: "rgba(30, 107, 82, 0.15)", // Primary with opacity for content areas
  },

  // Element dimensions
  sizes: {
    canvasWidth: 800,
    canvasHeight: 600,
  },

  // Animation durations
  animations: {
    standard: 0.5,
    slow: 0.8,
  },
};

// Feature flags
export const FEATURES = {
  enableMultiSampleComparison: true,
  enablePathwayAnalysis: true,
  enableDataExport: true,
};

// Default configurations
export const DEFAULTS = {
  sampleLimit: 10, // Number of samples to display per page
};
