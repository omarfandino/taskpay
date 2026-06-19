"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMiniPay } from "@/hooks/useMiniPay";
import { useTaskPayActions } from "@/hooks/useTaskPayActions";
import { useRefreshTaskPayViewsAfterTx } from "@/hooks/useInvalidateTaskPayReads";
import { useAppNotice } from "@/components/AppNotice";
import { getTakeTaskErrorMessage, isTaskNotOpenError } from "@/lib/task-errors";

export function useTakeTaskFlow(options?: {
  onTaken?: (taskId: bigint) => void;
  /** Another wallet took the task first — refresh UI without a blocking alert. */
  onTaskUnavailable?: (taskId: bigint) => void;
  /** e.g. refetch task detail after a failed take */
  onTakeFailed?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const { address } = useMiniPay();
  const { takeTask, isPending } = useTaskPayActions();
  const refreshViewsAfterTx = useRefreshTaskPayViewsAfterTx();
  const { showNotice } = useAppNotice();
  const [takingId, setTakingId] = useState<bigint | null>(null);
  const onTakenRef = useRef(options?.onTaken);
  onTakenRef.current = options?.onTaken;
  const onTaskUnavailableRef = useRef(options?.onTaskUnavailable);
  onTaskUnavailableRef.current = options?.onTaskUnavailable;
  const onTakeFailedRef = useRef(options?.onTakeFailed);
  onTakeFailedRef.current = options?.onTakeFailed;

  const handleTake = useCallback(
    async (taskId: bigint) => {
      if (!address) {
        showNotice(
          "Connect your wallet first using the Connect button above.",
          "info"
        );
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
        router.push(`/task/${taskId.toString()}`);
      } catch (err) {
        console.error(err);
        if (isTaskNotOpenError(err)) {
          await refreshViewsAfterTx();
          onTaskUnavailableRef.current?.(taskId);
          showNotice("Someone else just took that task.", "info");
          await onTakeFailedRef.current?.();
          return;
        }
        await onTakeFailedRef.current?.();
        showNotice(getTakeTaskErrorMessage(err));
      } finally {
        setTakingId(null);
      }
    },
    [address, refreshViewsAfterTx, router, showNotice, takeTask]
  );

  const isTaking = (taskId: bigint) => takingId === taskId && isPending;

  return { handleTake, isTaking, isPending: takingId !== null && isPending };
}
