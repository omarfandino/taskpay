"use client";

import { useCallback } from "react";
import type { Query } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { DEMO_STORAGE_MODE } from "@/lib/demo-config";
import { useTaskPayAddress } from "@/hooks/useTaskPayAddress";

function taskPayReadPredicate(
  taskPayAddress: string
): (query: Query) => boolean {
  const address = taskPayAddress.toLowerCase();
  return (query) => {
    if (query.queryKey[0] !== "readContract") return false;
    const params = query.queryKey[1] as { address?: string } | undefined;
    return params?.address?.toLowerCase() === address;
  };
}

/** Bust and refetch all TaskPay contract reads (lists + single task). */
export function useRefreshTaskPayViews() {
  const queryClient = useQueryClient();
  const taskPayAddress = useTaskPayAddress();

  return useCallback(async () => {
    if (DEMO_STORAGE_MODE || !taskPayAddress) return;

    const predicate = taskPayReadPredicate(taskPayAddress);

    await queryClient.invalidateQueries({
      predicate,
      refetchType: "all",
    });
    await queryClient.refetchQueries({
      predicate,
      type: "all",
    });
  }, [queryClient, taskPayAddress]);
}

/** @deprecated Use useRefreshTaskPayViews — kept for existing call sites. */
export function useInvalidateTaskPayReads() {
  return useRefreshTaskPayViews();
}

/** Second pass after navigation — helps when the RPC lags behind the receipt. */
export function useRefreshTaskPayViewsAfterTx() {
  const refresh = useRefreshTaskPayViews();

  return useCallback(async () => {
    await refresh();
    await new Promise((resolve) => setTimeout(resolve, 900));
    await refresh();
  }, [refresh]);
}
