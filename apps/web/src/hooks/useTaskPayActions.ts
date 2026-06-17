"use client";

import { useCallback, useState } from "react";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { taskPayAbi, erc20Abi } from "@/lib/taskpay-abi";
import { DEMO_STORAGE_MODE } from "@/lib/demo-config";
import { feeCurrencyFor, getCopmAddress } from "@/lib/tx";
import { useMiniPay } from "@/hooks/useMiniPay";
import { useTaskPayAddress } from "@/hooks/useTaskPayAddress";
import {
  demoApproveTask,
  demoCancelTask,
  demoMarkTaskComplete,
  demoPostTask,
  demoRejectSeedTask,
  demoRejectTask,
  demoApproveSeedTask,
  demoSubmitEvidence,
  isDemoSeedTask,
  demoTakeTask,
  simulateTxDelay,
} from "@/lib/demo-store";

export function useCopmAllowance(rewardAmount: bigint): {
  needsApproval: boolean;
  allowance: bigint | undefined;
} {
  const { address, chainId, mounted } = useMiniPay();
  const taskPayAddress = useTaskPayAddress();
  const copmAddress = getCopmAddress(chainId);

  const { data: allowance } = useReadContract({
    address: copmAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args:
      address && taskPayAddress ? [address, taskPayAddress] : undefined,
    query: {
      enabled: Boolean(
        !DEMO_STORAGE_MODE &&
          mounted &&
          address &&
          taskPayAddress &&
          rewardAmount > 0n
      ),
    },
  });

  if (DEMO_STORAGE_MODE) {
    return { needsApproval: false, allowance: undefined };
  }

  const allowanceBn = allowance as bigint | undefined;
  return {
    needsApproval:
      allowanceBn === undefined || allowanceBn < rewardAmount,
    allowance: allowanceBn,
  };
}

export function useTaskPayActions() {
  const { address, chainId } = useMiniPay();
  const taskPayAddress = useTaskPayAddress();
  const copmAddress = getCopmAddress(chainId);

  const { writeContractAsync, data: txHash, isPending } = useWriteContract();
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash: txHash });

  const [demoPending, setDemoPending] = useState(false);
  const [simulatedTx, setSimulatedTx] = useState(false);

  const busy = DEMO_STORAGE_MODE ? demoPending : isPending || confirming;

  const runDemo = useCallback(async (fn: () => void) => {
    setDemoPending(true);
    setSimulatedTx(true);
    try {
      await simulateTxDelay();
      fn();
    } finally {
      setDemoPending(false);
    }
  }, []);

  const postTask = useCallback(
    async (
      description: string,
      location: string,
      deadline: bigint,
      reward: bigint
    ): Promise<string | null> => {
      if (!address) return null;

      if (DEMO_STORAGE_MODE) {
        await runDemo(() =>
          demoPostTask(address, description, location, deadline, reward)
        );
        return "demo-simulated";
      }

      if (!taskPayAddress) return null;

      const hash = await writeContractAsync({
        address: taskPayAddress,
        abi: taskPayAbi,
        functionName: "postTask",
        args: [description, location, deadline, reward],
        ...feeCurrencyFor(chainId),
      });
      setSimulatedTx(false);
      return hash;
    },
    [address, runDemo, taskPayAddress, writeContractAsync, chainId]
  );

  const approveCopm = useCallback(
    async (rewardAmount: bigint): Promise<void> => {
      if (DEMO_STORAGE_MODE || !address || !taskPayAddress) return;
      await writeContractAsync({
        address: copmAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [taskPayAddress, rewardAmount],
        ...feeCurrencyFor(chainId),
      });
    },
    [address, chainId, copmAddress, taskPayAddress, writeContractAsync]
  );

  const takeTask = useCallback(
    async (taskId: bigint): Promise<string | null> => {
      if (!address) return null;

      if (DEMO_STORAGE_MODE) {
        await runDemo(() => demoTakeTask(taskId, address));
        return "demo-simulated";
      }

      if (!taskPayAddress) return null;

      const hash = await writeContractAsync({
        address: taskPayAddress,
        abi: taskPayAbi,
        functionName: "takeTask",
        args: [taskId],
        ...feeCurrencyFor(chainId),
      });
      setSimulatedTx(false);
      return hash;
    },
    [address, runDemo, taskPayAddress, writeContractAsync, chainId]
  );

  const submitEvidence = useCallback(
    async (taskId: bigint, evidenceUrl: string): Promise<string | null> => {
      if (!address) return null;

      if (DEMO_STORAGE_MODE) {
        await runDemo(() =>
          demoSubmitEvidence(taskId, address, evidenceUrl)
        );
        return "demo-simulated";
      }

      if (!taskPayAddress) return null;

      const hash = await writeContractAsync({
        address: taskPayAddress,
        abi: taskPayAbi,
        functionName: "submitEvidence",
        args: [taskId, evidenceUrl],
        ...feeCurrencyFor(chainId),
      });
      setSimulatedTx(false);
      return hash;
    },
    [address, runDemo, taskPayAddress, writeContractAsync, chainId]
  );

  const approveTask = useCallback(
    async (taskId: bigint, asDemoSeed = false): Promise<string | null> => {
      if (!address && !asDemoSeed) return null;

      if (DEMO_STORAGE_MODE) {
        await runDemo(() =>
          asDemoSeed
            ? demoApproveSeedTask(taskId)
            : demoApproveTask(taskId, address!)
        );
        return "demo-simulated";
      }

      if (!taskPayAddress || !address) return null;

      const hash = await writeContractAsync({
        address: taskPayAddress,
        abi: taskPayAbi,
        functionName: "approveTask",
        args: [taskId],
        ...feeCurrencyFor(chainId),
      });
      setSimulatedTx(false);
      return hash;
    },
    [address, runDemo, taskPayAddress, writeContractAsync, chainId]
  );

  const rejectTask = useCallback(
    async (taskId: bigint, asDemoSeed = false): Promise<string | null> => {
      if (!address && !asDemoSeed) return null;

      if (DEMO_STORAGE_MODE) {
        await runDemo(() =>
          asDemoSeed
            ? demoRejectSeedTask(taskId)
            : demoRejectTask(taskId, address!)
        );
        return "demo-simulated";
      }

      if (!taskPayAddress || !address) return null;

      const hash = await writeContractAsync({
        address: taskPayAddress,
        abi: taskPayAbi,
        functionName: "rejectTask",
        args: [taskId],
        ...feeCurrencyFor(chainId),
      });
      setSimulatedTx(false);
      return hash;
    },
    [address, runDemo, taskPayAddress, writeContractAsync, chainId]
  );

  const markTaskComplete = useCallback(
    async (taskId: bigint): Promise<string | null> => {
      if (!address) return null;

      if (DEMO_STORAGE_MODE) {
        await runDemo(() => demoMarkTaskComplete(taskId, address));
        return "demo-simulated";
      }

      if (!taskPayAddress) return null;

      const hash = await writeContractAsync({
        address: taskPayAddress,
        abi: taskPayAbi,
        functionName: "markTaskComplete",
        args: [taskId],
        ...feeCurrencyFor(chainId),
      });
      setSimulatedTx(false);
      return hash;
    },
    [address, runDemo, taskPayAddress, writeContractAsync, chainId]
  );

  const cancelTask = useCallback(
    async (taskId: bigint): Promise<string | null> => {
      if (!address) return null;

      if (DEMO_STORAGE_MODE) {
        await runDemo(() => demoCancelTask(taskId, address));
        return "demo-simulated";
      }

      if (!taskPayAddress) return null;

      const hash = await writeContractAsync({
        address: taskPayAddress,
        abi: taskPayAbi,
        functionName: "cancelTask",
        args: [taskId],
        ...feeCurrencyFor(chainId),
      });
      setSimulatedTx(false);
      return hash;
    },
    [address, runDemo, taskPayAddress, writeContractAsync, chainId]
  );

  return {
    postTask,
    approveCopm,
    takeTask,
    submitEvidence,
    markTaskComplete,
    approveTask,
    rejectTask,
    cancelTask,
    isPending: busy,
    txHash: DEMO_STORAGE_MODE ? null : txHash,
    isSimulated: DEMO_STORAGE_MODE && simulatedTx,
    isDemoMode: DEMO_STORAGE_MODE,
  };
}
