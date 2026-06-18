"use client";

import { useEffect } from "react";
import { useRefreshTaskPayViews } from "@/hooks/useInvalidateTaskPayReads";

/** Refetch TaskPay contract data when a page mounts or the wallet connects. */
export function useTaskPayViewRefreshOnMount(enabled = true) {
  const refresh = useRefreshTaskPayViews();

  useEffect(() => {
    if (!enabled) return;
    void refresh();
  }, [enabled, refresh]);
}
