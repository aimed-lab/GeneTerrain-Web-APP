import { extendTheme, ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

const colors = {
  geneTerrain: {
    // Core colors - light theme with green/teal accents
    primary: "#1E6B52", // Dark green (ONLY for headers)
    secondary: "#295135", // Darker green (secondary elements)
    accent1: "#80BC00", // Lime green
    accent2: "#FFD400", // Yellow accent
    neutral: "#606060", // Gray text
    gray: "#808285", // Standard gray

    // Text colors
    textPrimary: "#333333", // Dark text for light backgrounds
    textSecondary: "#444444", // Secondary text color
    textMuted: "#666666", // Muted text color

    // Background colors - ALL white for content areas
    bg: "#FFFFFF", // Main background
    cardBg: "#FFFFFF", // Card background
    tableBg: "#FFFFFF", // Table background
    inputBg: "#FFFFFF", // Input background
    sectionBg: "#FFFFFF", // Section background

    // Border colors - light gray for all borders
    border: "#E2E8F0", // Light gray border

    // Header/accent backgrounds
    // headerBg: "#1E6B52", // Green ONLY for headers
    headerBg: "#31755f",
  },
};

const theme = extendTheme({
  config,
  colors,
  components: {
    // All containers should have white backgrounds
    Box: {
      baseStyle: {
        bg: "white",
      },
      variants: {
        navbar: {
          bg: "geneTerrain.headerBg",
          color: "white",
        },
        section: {
          bg: "white",
          borderRadius: "md",
          borderWidth: "1px",
          borderColor: "geneTerrain.border",
          overflow: "hidden",
          boxShadow: "sm",
        },
        header: {
          bg: "geneTerrain.headerBg",
          color: "white",
          py: 2,
          px: 4,
        },
      },
    },
    // All inputs should have white backgrounds
    Input: {
      variants: {
        outline: {
          field: {
            color: "geneTerrain.textPrimary",
            backgroundColor: "white",
            _placeholder: { color: "gray.500" },
            borderColor: "geneTerrain.border",
            borderRadius: "md",
          },
        },
        filled: {
          field: {
            color: "geneTerrain.textPrimary",
            backgroundColor: "white",
            _focus: {
              backgroundColor: "white",
            },
          },
        },
      },
    },
    // All buttons should match the target style
    Button: {
      variants: {
        solid: {
          bg: "geneTerrain.accent1",
          color: "white",
        },
        outline: {
          borderColor: "geneTerrain.primary",
          color: "geneTerrain.primary",
        },
      },
    },
    // Table styling to match target
    Table: {
      baseStyle: {
        th: {
          bg: "geneTerrain.headerBg",
          color: "white",
        },
        td: {
          bg: "white",
          color: "geneTerrain.textPrimary",
          borderColor: "geneTerrain.border",
        },
      },
    },
  },
  styles: {
    global: {
      body: {
        bg: "white",
        color: "geneTerrain.textPrimary",
      },
      // Override ANY component that might be using green backgrounds
      ".dataset-section, .sample-section, .visualization-section, .section": {
        bg: "white !important",
        borderWidth: "1px",
        borderColor: "geneTerrain.border",
        borderRadius: "md",
        overflow: "hidden",
      },
      ".section-header, .header": {
        bg: "geneTerrain.headerBg !important",
        color: "white !important",
      },
      // Force all content areas to be white
      ".content-area, .panel-bg": {
        bg: "white !important",
      },
      // Force all table elements to be white
      "table, tr, td": {
        bg: "white !important",
        color: "geneTerrain.textPrimary !important",
      },
      th: {
        bg: "geneTerrain.headerBg !important",
        color: "white !important",
      },
      // Force all inputs to have white backgrounds
      "input, select, textarea": {
        bg: "white !important",
        color: "geneTerrain.textPrimary !important",
      },
    },
  },
});

export default theme;
