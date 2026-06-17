"use client";

import { useMemo, useState } from "react";
import { useReadContract } from "wagmi";
import { taskPayAbi } from "@/lib/taskpay-abi";
import { Task } from "@/lib/constants";
import { useMiniPay } from "@/hooks/useMiniPay";
import { useTaskPayAddress } from "@/hooks/useTaskPayAddress";
import { ContractNotDeployed } from "@/components/ContractNotDeployed";
import { TaskCard } from "@/components/TaskCard";
import { PageHeader } from "@/components/PageHeader";
import { SegmentTabs } from "@/components/SegmentTabs";
import { EmptyState } from "@/components/EmptyState";
import { parseTasks } from "@/components/task-utils";

type Tab = "posted" | "taken";

export default function MyTasksPage() {
  const { address, isMiniPay, mounted } = useMiniPay();
  const taskPayAddress = useTaskPayAddress();
  const [tab, setTab] = useState<Tab>("posted");

  const { data: postedRaw, isLoading: loadingPosted } = useReadContract({
    address: taskPayAddress,
    abi: taskPayAbi,
    functionName: "getTasksByPoster",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(taskPayAddress && address) },
  });

  const { data: takenRaw, isLoading: loadingTaken } = useReadContract({
    address: taskPayAddress,
    abi: taskPayAbi,
    functionName: "getTasksByTaker",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(taskPayAddress && address) },
  });

  const posted: Task[] = useMemo(
    () => parseTasks(postedRaw as Parameters<typeof parseTasks>[0]).reverse(),
    [postedRaw]
  );

  const taken: Task[] = useMemo(
    () => parseTasks(takenRaw as Parameters<typeof parseTasks>[0]).reverse(),
    [takenRaw]
  );

  const tasks = tab === "posted" ? posted : taken;
  const loading = tab === "posted" ? loadingPosted : loadingTaken;

  return (
    <div className="page-shell mx-auto max-w-lg px-4 pb-28 pt-5">
      <PageHeader
        title="My tasks"
        subtitle="Track tasks you posted or accepted."
      />

      <SegmentTabs
        tabs={[
          { id: "posted", label: "Posted" },
          { id: "taken", label: "Taken" },
        ]}
        active={tab}
        onChange={(id) => setTab(id as Tab)}
      />

      {mounted && !address && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {isMiniPay
            ? "Connecting your MiniPay wallet…"
            : "Open TaskPay in MiniPay to see your tasks."}
        </p>
      )}

      {!taskPayAddress && <ContractNotDeployed />}

      {address && taskPayAddress && loading && (
        <div className="space-y-4 py-2">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton h-40 rounded-2xl" />
          ))}
        </div>
      )}

      {address && taskPayAddress && !loading && tasks.length === 0 && (
        <EmptyState
          title={`No ${tab} tasks yet`}
          description={
            tab === "posted"
              ? "Post a task from the Create tab."
              : "Take a task from the Feed."
          }
        />
      )}

      <div className="space-y-4">
        {tasks.map((task) => (
          <TaskCard key={task.id.toString()} task={task} linkToDetail />
        ))}
      </div>
    </div>
  );
}
