"use client";

import { DebugLogPanel } from "@/components/DebugLogPanel";
import { appendClientDebugLine, isDebugUiEnabled, setDebugUiEnabled } from "@/lib/client-debug-log";
import { useEffect, useState } from "react";

export function GlobalDebugPanelMount() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const flag = url.searchParams.get("debug");
    if (flag === "1") {
      setDebugUiEnabled(true);
      appendClientDebugLine("debug mode enabled by query param debug=1");
    } else if (flag === "0") {
      setDebugUiEnabled(false);
      appendClientDebugLine("debug mode disabled by query param debug=0");
    }
    const t = window.setTimeout(() => setEnabled(isDebugUiEnabled()), 0);
    return () => clearTimeout(t);
  }, []);

  if (!enabled) return null;
  return <DebugLogPanel enabled fetchServerLogs={false} />;
}
