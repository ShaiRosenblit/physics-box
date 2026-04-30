import { createContext, useContext } from "react";
import type { SimulationApi } from "./useSimulation";

const SimulationContext = createContext<SimulationApi | null>(null);

export function SimulationProvider(props: {
  value: SimulationApi;
  children: React.ReactNode;
}) {
  return (
    <SimulationContext.Provider value={props.value}>
      {props.children}
    </SimulationContext.Provider>
  );
}

export function useSimulationContext(): SimulationApi {
  const ctx = useContext(SimulationContext);
  if (!ctx) {
    throw new Error("useSimulationContext must be used inside SimulationProvider");
  }
  return ctx;
}
