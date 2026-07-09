"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { DUMMY_DATA_STORAGE_KEY, isDummyDataAvailable } from "@/lib/dev/dummy-data";

interface DummyDataContextValue {
  enabled: boolean;
  available: boolean;
  setEnabled: (value: boolean) => void;
  toggle: () => void;
}

const DummyDataContext = createContext<DummyDataContextValue>({
  enabled: false,
  available: false,
  setEnabled: () => {},
  toggle: () => {},
});

export function DummyDataProvider({ children }: { children: ReactNode }) {
  const available = isDummyDataAvailable();
  const [enabled, setEnabledState] = useState(false);

  useEffect(() => {
    if (!available) return;
    const stored = localStorage.getItem(DUMMY_DATA_STORAGE_KEY);
    setEnabledState(stored === "1");
  }, [available]);

  const setEnabled = useCallback(
    (value: boolean) => {
      if (!available) return;
      setEnabledState(value);
      localStorage.setItem(DUMMY_DATA_STORAGE_KEY, value ? "1" : "0");
    },
    [available]
  );

  const toggle = useCallback(() => {
    setEnabledState((prev) => {
      const next = !prev;
      localStorage.setItem(DUMMY_DATA_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  return (
    <DummyDataContext.Provider value={{ enabled, available, setEnabled, toggle }}>
      {children}
    </DummyDataContext.Provider>
  );
}

export function useDummyData() {
  return useContext(DummyDataContext);
}
