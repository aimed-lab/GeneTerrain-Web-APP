import { useContext } from "react";
import { GBMDataContext } from "./GBMDataProvider";

/**
 * Custom hook to access GBM data and utility functions
 */
export const useGBMData = () => {
  const context = useContext(GBMDataContext);

  if (context === undefined) {
    throw new Error("useGBMData must be used within a GBMDataProvider");
  }

  return context;
};
