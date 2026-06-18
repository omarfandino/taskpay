"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DEMO_STORAGE_MODE } from "@/lib/demo-config";
import { useTaskPayAddress } from "@/hooks/useTaskPayAddress";

/** Bust wagmi readContract cache for all TaskPay view calls after a mutation. */
export function useInvalidateTaskPayReads() {
  const queryClient = useQueryClient();
  const taskPayAddress = useTaskPayAddress();

  return useCallback(async () => {
    if (DEMO_STORAGE_MODE || !taskPayAddress) return;

    const address = taskPayAddress.toLowerCase();

    await queryClient.invalidateQueries({
      predicate: (query) => {
        if (query.queryKey[0] !== "readContract") return false;
        const params = query.queryKey[1] as { address?: string } | undefined;
        return params?.address?.toLowerCase() === address;
      },
    });
  }, [queryClient, taskPayAddress]);
}
