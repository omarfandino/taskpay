"use client";

import { useState } from "react";
import { useMiniPay } from "@/hooks/useMiniPay";
import { useMyTasks, useTaskPayAvailable } from "@/hooks/useTaskPayReads";
import { ContractNotDeployed } from "@/components/ContractNotDeployed";
import { TaskCard } from "@/components/TaskCard";
import { PageHeader } from "@/components/PageHeader";
import { SegmentTabs } from "@/components/SegmentTabs";
import { EmptyState } from "@/components/EmptyState";

import { useTaskPayViewRefreshOnMount } from "@/hooks/useTaskPayViewRefreshOnMount";

type Tab = "posted" | "taken";

export default function MyTasksPage() {
  const { address, isMiniPay, mounted } = useMiniPay();
  const taskPayAvailable = useTaskPayAvailable();
  const [tab, setTab] = useState<Tab>("posted");

  useTaskPayViewRefreshOnMount(Boolean(address && taskPayAvailable));

  const { posted, taken, isLoadingPosted, isLoadingTaken } = useMyTasks(address);

  const tasks = tab === "posted" ? posted : taken;
  const loading = tab === "posted" ? isLoadingPosted : isLoadingTaken;

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

      {!taskPayAvailable && <ContractNotDeployed />}

      {address && taskPayAvailable && loading && (
        <div className="space-y-4 py-2">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton h-40 rounded-2xl" />
          ))}
        </div>
      )}

      {address && taskPayAvailable && !loading && tasks.length === 0 && (
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
