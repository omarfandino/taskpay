"use client";

import { useCallback, useState } from "react";
import {
  usePublicClient,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { taskPayAbi, erc20Abi } from "@/lib/taskpay-abi";
import { DEMO_STORAGE_MODE } from "@/lib/demo-config";
import { feeCurrencyFor, getCopmAddress } from "@/lib/tx";
import { useMiniPay } from "@/hooks/useMiniPay";
import { useTaskPayAddress } from "@/hooks/useTaskPayAddress";
import { useInvalidateTaskPayReads } from "@/hooks/useInvalidateTaskPayReads";
import {
  demoApproveTask,
  demoCancelTask,
  demoCompleteTask,
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
  const publicClient = usePublicClient({ chainId });
  const invalidateTaskReads = useInvalidateTaskPayReads();

  const { writeContractAsync, data: txHash, isPending } = useWriteContract();
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash: txHash });

  const [demoPending, setDemoPending] = useState(false);
  const [simulatedTx, setSimulatedTx] = useState(false);

  const busy = DEMO_STORAGE_MODE ? demoPending : isPending || confirming;

  const waitForReceipt = useCallback(
    async (hash: `0x${string}`) => {
      if (!publicClient) {
        throw new Error("Network client not ready. Try again.");
      }
      await publicClient.waitForTransactionReceipt({ hash });
      await invalidateTaskReads();
    },
    [invalidateTaskReads, publicClient]
  );

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
        ...feeCurrencyFor(),
      });
      setSimulatedTx(false);
      await waitForReceipt(hash);
      return hash;
    },
    [address, chainId, runDemo, taskPayAddress, waitForReceipt, writeContractAsync]
  );

  const approveCopm = useCallback(
    async (rewardAmount: bigint): Promise<`0x${string}` | null> => {
      if (DEMO_STORAGE_MODE || !address || !taskPayAddress) return null;

      const hash = await writeContractAsync({
        address: copmAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [taskPayAddress, rewardAmount],
        ...feeCurrencyFor(),
      });
      await waitForReceipt(hash);
      return hash;
    },
    [
      address,
      chainId,
      copmAddress,
      taskPayAddress,
      waitForReceipt,
      writeContractAsync,
    ]
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
        ...feeCurrencyFor(),
      });
      setSimulatedTx(false);
      await waitForReceipt(hash);
      return hash;
    },
    [address, chainId, runDemo, taskPayAddress, waitForReceipt, writeContractAsync]
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
        ...feeCurrencyFor(),
      });
      setSimulatedTx(false);
      await waitForReceipt(hash);
      return hash;
    },
    [address, chainId, runDemo, taskPayAddress, waitForReceipt, writeContractAsync]
  );

  const completeTask = useCallback(
    async (taskId: bigint, evidenceUrl: string): Promise<string | null> => {
      if (!address) return null;

      if (DEMO_STORAGE_MODE) {
        await runDemo(() =>
          demoCompleteTask(taskId, address, evidenceUrl)
        );
        return "demo-simulated";
      }

      if (!taskPayAddress) return null;

      const hash = await writeContractAsync({
        address: taskPayAddress,
        abi: taskPayAbi,
        functionName: "completeTask",
        args: [taskId, evidenceUrl],
        ...feeCurrencyFor(),
      });
      setSimulatedTx(false);
      await waitForReceipt(hash);
      return hash;
    },
    [address, chainId, runDemo, taskPayAddress, waitForReceipt, writeContractAsync]
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
        ...feeCurrencyFor(),
      });
      setSimulatedTx(false);
      await waitForReceipt(hash);
      return hash;
    },
    [address, chainId, runDemo, taskPayAddress, waitForReceipt, writeContractAsync]
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
        ...feeCurrencyFor(),
      });
      setSimulatedTx(false);
      await waitForReceipt(hash);
      return hash;
    },
    [address, chainId, runDemo, taskPayAddress, waitForReceipt, writeContractAsync]
  );

  const markTaskComplete = useCallback(
    async (taskId: bigint): Promise<string | null> => {
      if (!address) return null;

      if (DEMO_STORAGE_MODE) {
        throw new Error("Use completeTask with evidence URL in demo mode.");
      }

      if (!taskPayAddress) return null;

      const hash = await writeContractAsync({
        address: taskPayAddress,
        abi: taskPayAbi,
        functionName: "markTaskComplete",
        args: [taskId],
        ...feeCurrencyFor(),
      });
      setSimulatedTx(false);
      await waitForReceipt(hash);
      return hash;
    },
    [address, chainId, taskPayAddress, waitForReceipt, writeContractAsync]
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
        ...feeCurrencyFor(),
      });
      setSimulatedTx(false);
      await waitForReceipt(hash);
      return hash;
    },
    [address, chainId, runDemo, taskPayAddress, waitForReceipt, writeContractAsync]
  );

  return {
    postTask,
    approveCopm,
    takeTask,
    submitEvidence,
    completeTask,
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
