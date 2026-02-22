"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const KEY = "netnet.work.current";

export function useWorkSession() {
  const [workId, setWorkId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v) setWorkId(v);
    } catch {}
  }, []);

  const set = useCallback((id: string | null) => {
    setWorkId(id);
    try {
      if (!id) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, id);
    } catch {}
  }, []);

  return useMemo(() => ({ workId, setWorkId: set }), [workId, set]);
}
