import React, { createContext, useContext, useState, ReactNode } from "react";
import { useAuth } from "./AuthContext";

interface PremiumContextType {
  isPremiumUser: boolean;
  premiumFeatures: {
    customGeneTerrain: boolean;
    // Add other premium features here in the future
  };
}

const defaultContext: PremiumContextType = {
  isPremiumUser: false,
  premiumFeatures: {
    customGeneTerrain: false,
  },
};

const PremiumContext = createContext<PremiumContextType>(defaultContext);

export const usePremium = () => useContext(PremiumContext);

interface PremiumProviderProps {
  children: ReactNode;
}

export const PremiumProvider: React.FC<PremiumProviderProps> = ({
  children,
}) => {
  const { isAuthenticated, user } = useAuth();

  // For now, treat all authenticated users as premium users
  // In the future, you can check user.subscriptionLevel or similar
  const isPremiumUser = true; // isAuthenticated; // When ready to restrict access, use isAuthenticated

  // Calculate which features are available based on premium status
  const premiumFeatures = {
    customGeneTerrain: isPremiumUser,
    // Add other premium features here in the future
  };

  return (
    <PremiumContext.Provider
      value={{
        isPremiumUser,
        premiumFeatures,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
};
