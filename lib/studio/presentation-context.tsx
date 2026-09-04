"use client";

import { createContext, useContext } from "react";

export interface StudioPresentationValue {
  presenting: boolean;
  setPresenting: (value: boolean) => void;
}

export const StudioPresentationContext =
  createContext<StudioPresentationValue>({
    presenting: false,
    setPresenting: () => {},
  });

export function useStudioPresentation(): StudioPresentationValue {
  return useContext(StudioPresentationContext);
}
