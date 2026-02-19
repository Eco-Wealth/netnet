"use client";

import { useEffect, useState } from "react";
import {
  CLARITY_DEFAULT,
  normalizeClarity,
  type ClarityLevel,
} from "@/lib/operator/clarity";

const CLARITY_STORAGE_KEY = "nn.operator.clarity";

export function useClarity() {
  const [clarity, setClarityState] = useState<ClarityLevel>(CLARITY_DEFAULT);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const next = normalizeClarity(window.localStorage.getItem(CLARITY_STORAGE_KEY) || undefined);
    setClarityState(next);
  }, []);

  function setClarity(next: ClarityLevel) {
    const normalized = normalizeClarity(next);
    setClarityState(normalized);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CLARITY_STORAGE_KEY, normalized);
    }
  }

  return { clarity, setClarity };
}
