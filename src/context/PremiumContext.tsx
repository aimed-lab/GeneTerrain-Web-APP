import React, { createContext, useContext, useState, ReactNode } from "react";

interface PremiumContextType {
  isPremiumUser: boolean;
  setPremiumUser: (value: boolean) => void;
  premiumFeatures: {
    customGeneTerrain: boolean;
    // Add other premium features here in the future
  };
}

const defaultContext: PremiumContextType = {
  isPremiumUser: true, // Default to true for now (everyone is premium)
  setPremiumUser: () => {},
  premiumFeatures: {
    customGeneTerrain: true,
  },
};

export const PremiumContext = createContext<PremiumContextType>(defaultContext);

export const usePremium = () => useContext(PremiumContext);

interface PremiumProviderProps {
  children: ReactNode;
}

export const PremiumProvider: React.FC<PremiumProviderProps> = ({
  children,
}) => {
  const [isPremiumUser, setIsPremiumUser] = useState<boolean>(true); // Default true for now

  // Calculate which features are available based on premium status
  const premiumFeatures = {
    customGeneTerrain: isPremiumUser,
    // Add other premium features here in the future
  };

  return (
    <PremiumContext.Provider
      value={{
        isPremiumUser,
        setPremiumUser: setIsPremiumUser,
        premiumFeatures,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
};
