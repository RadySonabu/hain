import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { isModelDownloaded } from "@/src/services/modelManager";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ModelContextValue {
  /** true once the model file is confirmed on disk */
  modelReady: boolean;
  /** Call this after a download completes to re-sync all consumers */
  refreshModelStatus: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────
const ModelContext = createContext<ModelContextValue>({
  modelReady: false,
  refreshModelStatus: async () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────
export function ModelProvider({ children }: { children: React.ReactNode }) {
  const [modelReady, setModelReady] = useState(false);

  const refreshModelStatus = useCallback(async () => {
    const downloaded = await isModelDownloaded().catch(() => false);
    setModelReady(downloaded);
  }, []);

  // Check on mount (non-blocking — app starts regardless)
  useEffect(() => {
    refreshModelStatus();
  }, [refreshModelStatus]);

  return (
    <ModelContext.Provider value={{ modelReady, refreshModelStatus }}>
      {children}
    </ModelContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useModelStatus(): ModelContextValue {
  return useContext(ModelContext);
}
