"use client";

import { useContext, useState, createContext, useMemo } from "react";

interface AnonymousModeContextType {
  isAnonymous: boolean;
  setIsAnonymous: (value: boolean) => void;
}

const AnonymousModeContext = createContext<
  AnonymousModeContextType | undefined
>(undefined);

export const useAnonymousMode = () => {
  const context = useContext(AnonymousModeContext);
  if (context === undefined) {
    throw new Error(
      "useAnonymousMode must be used within a AnonymousModeProvider"
    );
  }
  return context;
};

const AnonymousModeProvider: React.FC<{
  children: React.ReactNode;
  initialState?: boolean;
}> = ({ children, initialState = false }) => {
  const [isAnonymous, setIsAnonymous] = useState(initialState);
  const value = useMemo(() => ({ isAnonymous, setIsAnonymous }), [isAnonymous]);
  return (
    <AnonymousModeContext.Provider value={value}>
      {children}
    </AnonymousModeContext.Provider>
  );
};

export default AnonymousModeProvider;
