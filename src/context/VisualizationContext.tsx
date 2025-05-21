import React, { createContext, useContext, useState, useRef } from "react";
import { useToast } from "@chakra-ui/react";
import { useSamplesContext } from "./SamplesContext";

interface VisualizationContextType {
  isMapVisible: boolean;
  setIsMapVisible: React.Dispatch<React.SetStateAction<boolean>>;
  visualizationRef: React.RefObject<HTMLDivElement>;
  handleVisualize: () => void;
}

const VisualizationContext = createContext<
  VisualizationContextType | undefined
>(undefined);

export const VisualizationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isMapVisible, setIsMapVisible] = useState(false);
  const visualizationRef = useRef<HTMLDivElement>(null);
  const { selectedSamples } = useSamplesContext();
  const toast = useToast();

  // Update the handleVisualize function to include scrolling
  const handleVisualize = () => {
    if (selectedSamples.length === 0) {
      toast({
        title: "Selection required",
        description: "Please select at least one sample to visualize",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsMapVisible(true);

    // Use setTimeout to ensure the visualization is rendered before scrolling
    setTimeout(() => {
      if (visualizationRef.current) {
        visualizationRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100);
  };

  return (
    <VisualizationContext.Provider
      value={{
        isMapVisible,
        setIsMapVisible,
        visualizationRef,
        handleVisualize,
      }}
    >
      {children}
    </VisualizationContext.Provider>
  );
};

export const useVisualizationContext = () => {
  const context = useContext(VisualizationContext);
  if (context === undefined) {
    throw new Error(
      "useVisualizationContext must be used within a VisualizationProvider"
    );
  }
  return context;
};
