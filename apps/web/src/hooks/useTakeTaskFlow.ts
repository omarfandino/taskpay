"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMiniPay } from "@/hooks/useMiniPay";
import { useTaskPayActions } from "@/hooks/useTaskPayActions";
import { useRefreshTaskPayViewsAfterTx } from "@/hooks/useInvalidateTaskPayReads";

export function useTakeTaskFlow(options?: {
  onTaken?: (taskId: bigint) => void;
}) {
  const router = useRouter();
  const { address } = useMiniPay();
  const { takeTask, isPending } = useTaskPayActions();
  const refreshViewsAfterTx = useRefreshTaskPayViewsAfterTx();
  const [takingId, setTakingId] = useState<bigint | null>(null);
  const onTakenRef = useRef(options?.onTaken);
  onTakenRef.current = options?.onTaken;

  const handleTake = useCallback(
    async (taskId: bigint) => {
      if (!address) {
        alert("Connect your wallet first using the Connect button above.");
        return;
      }

      setTakingId(taskId);
      try {
        const hash = await takeTask(taskId);
        if (hash == null) {
          throw new Error("Could not take task.");
        }
        onTakenRef.current?.(taskId);
        await refreshViewsAfterTx();
        router.push("/my-tasks?tab=taken");
      } catch (err) {
        console.error(err);
        alert("Failed to take task. Check your balance and try again.");
      } finally {
        setTakingId(null);
      }
    },
    [address, refreshViewsAfterTx, router, takeTask]
  );

  const isTaking = (taskId: bigint) => takingId === taskId && isPending;

  return { handleTake, isTaking, isPending: takingId !== null && isPending };
}
