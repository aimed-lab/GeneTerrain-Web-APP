import { extendTheme, ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};

const colors = {
  geneTerrain: {
    primary: "#1E6B52", // dark green
    // secondary: "red",
    secondary: "#295135", // darker green
    accent1: "#80BC00", // lime green
    accent2: "#FFD400", // yellow
    neutral: "#AA9767", // beige
    gray: "#808285", // gray
  },
};

const theme = extendTheme({
  config,
  colors,
  components: {
    Input: {
      variants: {
        outline: {
          field: {
            color: "black",
            backgroundColor: "white",
            _placeholder: { color: "gray.500" },
          },
        },
      },
      defaultProps: {
        variant: "outline",
      },
    },
    Button: {
      variants: {
        solid: {
          bg: "geneTerrain.accent1",
          color: "white",
          _hover: {
            bg: "geneTerrain.primary",
            _disabled: {
              bg: "geneTerrain.accent1",
            },
          },
        },
      },
    },
  },
  styles: {
    global: {
      body: {
        bg: "geneTerrain.secondary",
        color: "white",
      },
    },
  },
});

export default theme;
