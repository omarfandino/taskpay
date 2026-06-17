"use client";

import { useEffect, useMemo, useState } from "react";
import { useReadContract } from "wagmi";
import { taskPayAbi } from "@/lib/taskpay-abi";
import { Task } from "@/lib/constants";
import { DEMO_STORAGE_MODE } from "@/lib/demo-config";
import { useTaskPayAddress } from "@/hooks/useTaskPayAddress";
import { parseTask, parseTasks } from "@/components/task-utils";
import {
  ensureDemoBalance,
  getDemoBalance,
  getOpenTasks,
  getTask,
  getTasksByPoster,
  getTasksByTaker,
  subscribeDemoStore,
} from "@/lib/demo-store";

export function useTaskPayAvailable(): boolean {
  const taskPayAddress = useTaskPayAddress();
  return DEMO_STORAGE_MODE || Boolean(taskPayAddress);
}

function useDemoStoreVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => subscribeDemoStore(() => setVersion((v) => v + 1)), []);
  return version;
}

export function useOpenTasks(): {
  tasks: Task[];
  isLoading: boolean;
  refetch: () => void;
} {
  const taskPayAddress = useTaskPayAddress();
  const version = useDemoStoreVersion();

  const { data: rawTasks, refetch, isLoading } = useReadContract({
    address: taskPayAddress,
    abi: taskPayAbi,
    functionName: "getOpenTasks",
    query: { enabled: Boolean(!DEMO_STORAGE_MODE && taskPayAddress) },
  });

  const demoTasks = useMemo(() => {
    if (!DEMO_STORAGE_MODE) return [];
    void version;
    return getOpenTasks();
  }, [version]);

  const chainTasks = useMemo(
    () =>
      parseTasks(
        rawTasks as readonly Parameters<typeof parseTask>[0][] | undefined
      ),
    [rawTasks]
  );

  if (DEMO_STORAGE_MODE) {
    return {
      tasks: demoTasks,
      isLoading: false,
      refetch: () => {},
    };
  }

  return { tasks: chainTasks, isLoading, refetch };
}

export function useTaskById(taskId: bigint): {
  task: Task | null;
  isLoading: boolean;
  refetch: () => void;
} {
  const taskPayAddress = useTaskPayAddress();
  const version = useDemoStoreVersion();

  const { data: rawTask, refetch, isLoading } = useReadContract({
    address: taskPayAddress,
    abi: taskPayAbi,
    functionName: "getTask",
    args: [taskId],
    query: { enabled: Boolean(!DEMO_STORAGE_MODE && taskPayAddress) },
  });

  const demoTask = useMemo(() => {
    if (!DEMO_STORAGE_MODE) return null;
    void version;
    return getTask(taskId);
  }, [taskId, version]);

  const chainTask = rawTask
    ? parseTask(rawTask as Parameters<typeof parseTask>[0])
    : null;

  if (DEMO_STORAGE_MODE) {
    return { task: demoTask, isLoading: false, refetch: () => {} };
  }

  return { task: chainTask, isLoading, refetch };
}

export function useMyTasks(address: `0x${string}` | undefined): {
  posted: Task[];
  taken: Task[];
  isLoadingPosted: boolean;
  isLoadingTaken: boolean;
} {
  const taskPayAddress = useTaskPayAddress();
  const version = useDemoStoreVersion();

  const { data: postedRaw, isLoading: loadingPosted } = useReadContract({
    address: taskPayAddress,
    abi: taskPayAbi,
    functionName: "getTasksByPoster",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(!DEMO_STORAGE_MODE && taskPayAddress && address) },
  });

  const { data: takenRaw, isLoading: loadingTaken } = useReadContract({
    address: taskPayAddress,
    abi: taskPayAbi,
    functionName: "getTasksByTaker",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(!DEMO_STORAGE_MODE && taskPayAddress && address) },
  });

  const demoPosted = useMemo(() => {
    if (!DEMO_STORAGE_MODE || !address) return [];
    void version;
    return getTasksByPoster(address);
  }, [address, version]);

  const demoTaken = useMemo(() => {
    if (!DEMO_STORAGE_MODE || !address) return [];
    void version;
    return getTasksByTaker(address);
  }, [address, version]);

  const chainPosted = useMemo(
    () => parseTasks(postedRaw as Parameters<typeof parseTasks>[0]).reverse(),
    [postedRaw]
  );

  const chainTaken = useMemo(
    () => parseTasks(takenRaw as Parameters<typeof parseTasks>[0]).reverse(),
    [takenRaw]
  );

  if (DEMO_STORAGE_MODE) {
    return {
      posted: [...demoPosted].reverse(),
      taken: [...demoTaken].reverse(),
      isLoadingPosted: false,
      isLoadingTaken: false,
    };
  }

  return {
    posted: chainPosted,
    taken: chainTaken,
    isLoadingPosted: loadingPosted,
    isLoadingTaken: loadingTaken,
  };
}

export function useDemoBalance(address: `0x${string}` | undefined): bigint | undefined {
  const version = useDemoStoreVersion();

  return useMemo(() => {
    if (!DEMO_STORAGE_MODE || !address) return undefined;
    void version;
    ensureDemoBalance(address);
    return getDemoBalance(address);
  }, [address, version]);
}
