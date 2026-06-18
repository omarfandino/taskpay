"use client";

import { useMemo, useState } from "react";
import { MapPin, Zap } from "lucide-react";
import { Task } from "@/lib/constants";
import { useMiniPay } from "@/hooks/useMiniPay";
import { useOpenTasks, useTaskPayAvailable } from "@/hooks/useTaskPayReads";
import { useTaskPayActions } from "@/hooks/useTaskPayActions";
import { ContractNotDeployed } from "@/components/ContractNotDeployed";
import { TaskCard } from "@/components/TaskCard";
import { LowBalanceNotice } from "@/components/MiniPayGuard";
import { SegmentTabs } from "@/components/SegmentTabs";
import { EmptyState } from "@/components/EmptyState";
import { getCurrentPosition, sortByDistance, LatLng } from "@/lib/geo";
import { ConnectWalletPrompt } from "@/components/ConnectWallet";
import { useRefreshTaskPayViewsAfterTx } from "@/hooks/useInvalidateTaskPayReads";
import { useTaskPayViewRefreshOnMount } from "@/hooks/useTaskPayViewRefreshOnMount";
import { getExplorerUrl } from "@/lib/constants";
import { DEMO_STORAGE_MODE } from "@/lib/demo-config";

type FilterMode = "all" | "nearby";

export default function FeedPage() {
  const { address, chainId, needsConnect, isMiniPay, mounted } = useMiniPay();
  const taskPayAvailable = useTaskPayAvailable();
  const [filter, setFilter] = useState<FilterMode>("all");
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [takingId, setTakingId] = useState<bigint | null>(null);
  const [takenTaskIds, setTakenTaskIds] = useState<Set<string>>(() => new Set());
  const [lastTx, setLastTx] = useState<string | null>(null);
  const [simulated, setSimulated] = useState(false);

  const refreshViewsAfterTx = useRefreshTaskPayViewsAfterTx();
  const { tasks: openTasks, isLoading, refetch } = useOpenTasks();
  const { takeTask, isPending } = useTaskPayActions();

  useTaskPayViewRefreshOnMount(taskPayAvailable);

  const tasks: Task[] = useMemo(() => {
    const visible = openTasks.filter(
      (task) => !takenTaskIds.has(task.id.toString())
    );
    if (filter === "nearby" && userLocation) {
      return sortByDistance(visible, userLocation);
    }
    return visible;
  }, [openTasks, filter, userLocation, takenTaskIds]);

  async function handleNearby() {
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      setUserLocation(pos);
      setFilter("nearby");
    } catch {
      alert("Could not get your location. Check permissions.");
    } finally {
      setLocating(false);
    }
  }

  async function handleTake(taskId: bigint) {
    if (!address) {
      alert("Connect your wallet first using the Connect button above.");
      return;
    }
    const taskKey = taskId.toString();
    setTakingId(taskId);
    try {
      const hash = await takeTask(taskId);
      setTakenTaskIds((prev) => new Set(prev).add(taskKey));
      await refreshViewsAfterTx();
      if (hash === "demo-simulated") {
        setSimulated(true);
        setLastTx(null);
        alert("Task taken! Open My Tasks → Taken to upload evidence.");
      } else if (hash) {
        setSimulated(false);
        setLastTx(hash);
      }
    } catch (err) {
      setTakenTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(taskKey);
        return next;
      });
      console.error(err);
      alert("Failed to take task. Check your balance and try again.");
    } finally {
      setTakingId(null);
    }
  }

  return (
    <div className="page-shell mx-auto max-w-lg px-4 pb-28 pt-5">
      <section className="hero-panel mb-5 overflow-hidden rounded-2xl p-5 shadow-card">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
          <Zap className="h-3.5 w-3.5" aria-hidden />
          {DEMO_STORAGE_MODE ? "Demo mode" : "Live on Celo"}
        </div>
        <h2 className="font-heading text-2xl font-extrabold leading-tight tracking-tight text-foreground">
          Earn COPm for{" "}
          <span className="text-primary">real tasks</span>
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Take micro-jobs near you. Get paid in digital pesos — instantly on MiniPay.
        </p>
      </section>

      {address && <LowBalanceNotice />}

      {mounted && needsConnect && !isMiniPay && (
        <div className="mb-5">
          <ConnectWalletPrompt
            title="Sign in to take tasks"
            description="Browse tasks below, then connect MetaMask on Celo Sepolia to take one and earn COPm."
          />
        </div>
      )}

      <SegmentTabs
        tabs={[
          { id: "all", label: "All tasks" },
          {
            id: "nearby",
            label: locating ? "Locating…" : "Nearby",
            icon: <MapPin className="h-4 w-4" />,
          },
        ]}
        active={filter}
        onChange={(id) => {
          if (id === "nearby") {
            handleNearby();
          } else {
            setFilter("all");
          }
        }}
      />

      {!taskPayAvailable && <ContractNotDeployed />}

      {isLoading && taskPayAvailable && (
        <div className="space-y-4 py-2">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton h-44 rounded-2xl" />
          ))}
        </div>
      )}

      {!isLoading && taskPayAvailable && tasks.length === 0 && (
        <EmptyState
          title="No open tasks yet"
          description="Be the first to post a micro-task and earn COPm!"
        />
      )}

      <div className="space-y-4">
        {tasks.map((task) => (
          <TaskCard
            key={task.id.toString()}
            task={task}
            showTake
            taking={takingId === task.id && isPending}
            onTake={handleTake}
          />
        ))}
      </div>

      {simulated && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Simulated — no on-chain transaction
        </p>
      )}

      {lastTx && chainId && !simulated && (
        <p className="mt-4 text-center text-sm">
          <a
            href={getExplorerUrl(chainId, lastTx)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-primary underline"
          >
            View transaction on Celoscan
          </a>
        </p>
      )}
    </div>
  );
}
