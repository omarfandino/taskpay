"use client";

import { useCallback, useMemo, useState } from "react";
import { decodeEventLog } from "viem";
import {
  usePublicClient,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { taskPayAbi, erc20Abi } from "@/lib/taskpay-abi";
import { DEMO_STORAGE_MODE } from "@/lib/demo-config";
import { feeCurrencyFor, getCopmAddress, getUsdcAddress, shouldPayBrowserFeesWithUsdc } from "@/lib/tx";
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

export type PostTaskResult = {
  hash: string | null;
  taskId?: bigint;
  simulated: boolean;
};

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
  const { address, chainId, isMiniPay } = useMiniPay();
  const taskPayAddress = useTaskPayAddress();
  const copmAddress = getCopmAddress(chainId);
  const usdcAddress = getUsdcAddress(chainId);
  const publicClient = usePublicClient({ chainId });
  const invalidateTaskReads = useInvalidateTaskPayReads();

  const { data: usdcBalance } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(!DEMO_STORAGE_MODE && address && !isMiniPay),
    },
  });

  const txFeeCurrency = useMemo(
    () =>
      feeCurrencyFor(chainId, {
        payFeesWithUsdc:
          !isMiniPay &&
          shouldPayBrowserFeesWithUsdc(usdcBalance as bigint | undefined),
      }),
    [chainId, isMiniPay, usdcBalance]
  );

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
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "reverted") {
        throw new Error("Transaction reverted.");
      }
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
    ): Promise<PostTaskResult | null> => {
      if (!address) return null;

      if (DEMO_STORAGE_MODE) {
        let taskId = 0n;
        await runDemo(() => {
          taskId = demoPostTask(address, description, location, deadline, reward);
        });
        return { hash: null, taskId, simulated: true };
      }

      if (!taskPayAddress || !publicClient) return null;

      const hash = await writeContractAsync({
        address: taskPayAddress,
        abi: taskPayAbi,
        functionName: "postTask",
        args: [description, location, deadline, reward],
        ...txFeeCurrency,
      });
      setSimulatedTx(false);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      await invalidateTaskReads();

      let taskId: bigint | undefined;
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== taskPayAddress.toLowerCase()) continue;
        try {
          const decoded = decodeEventLog({
            abi: taskPayAbi,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "TaskPosted") {
            taskId = decoded.args.taskId as bigint;
            break;
          }
        } catch {
          // not TaskPosted
        }
      }

      return { hash, taskId, simulated: false };
    },
    [
      address,
      invalidateTaskReads,
      publicClient,
      runDemo,
      taskPayAddress,
      writeContractAsync,
    ]
  );

  const approveCopm = useCallback(
    async (rewardAmount: bigint): Promise<`0x${string}` | null> => {
      if (DEMO_STORAGE_MODE || !address || !taskPayAddress) return null;

      const hash = await writeContractAsync({
        address: copmAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [taskPayAddress, rewardAmount],
        ...txFeeCurrency,
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
        ...txFeeCurrency,
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
        ...txFeeCurrency,
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
        ...txFeeCurrency,
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
        ...txFeeCurrency,
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
        ...txFeeCurrency,
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
        ...txFeeCurrency,
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
        ...txFeeCurrency,
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
