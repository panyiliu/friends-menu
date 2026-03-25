"use client";

import { DebugLogPanel } from "@/components/DebugLogPanel";
import { useEffect, useState } from "react";

export function GlobalDebugPanelMount() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/public/debug-config", { cache: "no-store" });
        const data = (await res.json()) as { ok?: boolean; debugUiEnabled?: boolean };
        if (!cancelled) setEnabled(Boolean(data?.debugUiEnabled));
      } catch {
        if (!cancelled) setEnabled(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!enabled) return null;
  return <DebugLogPanel enabled fetchServerLogs={false} />;
}
