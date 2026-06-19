"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMiniPay } from "@/hooks/useMiniPay";
import { useMyTasks, useTaskPayAvailable } from "@/hooks/useTaskPayReads";
import { ContractNotDeployed } from "@/components/ContractNotDeployed";
import { TaskCard } from "@/components/TaskCard";
import { PageHeader } from "@/components/PageHeader";
import { SegmentTabs } from "@/components/SegmentTabs";
import { EmptyState } from "@/components/EmptyState";
import { ConnectWalletPrompt } from "@/components/ConnectWallet";
import { useRefreshTaskPayViews } from "@/hooks/useInvalidateTaskPayReads";
import { useTaskPayViewRefreshOnMount } from "@/hooks/useTaskPayViewRefreshOnMount";

type Tab = "posted" | "taken";

function tabFromParam(value: string | null): Tab {
  return value === "taken" ? "taken" : "posted";
}

export function MyTasksView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = tabFromParam(searchParams.get("tab"));

  const { address, isMiniPay, mounted, needsConnect } = useMiniPay();
  const taskPayAvailable = useTaskPayAvailable();
  const refreshViews = useRefreshTaskPayViews();

  useTaskPayViewRefreshOnMount(Boolean(address && taskPayAvailable));

  useEffect(() => {
    void refreshViews();
  }, [refreshViews, tab]);

  function selectTab(next: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    if (next === "taken") {
      void refreshViews();
    }
  }

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
        onChange={(id) => selectTab(id as Tab)}
      />

      {mounted && needsConnect && (
        <div className="py-4">
          {isMiniPay ? (
            <p className="text-center text-sm text-muted-foreground">
              Connecting your MiniPay wallet…
            </p>
          ) : (
            <ConnectWalletPrompt
              title="Sign in to see your tasks"
              description="Connect the wallet you used to post or take tasks."
            />
          )}
        </div>
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
