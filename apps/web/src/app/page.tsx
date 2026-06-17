"use client";

import { useMemo, useState } from "react";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { MapPin, Zap } from "lucide-react";
import { taskPayAbi } from "@/lib/taskpay-abi";
import { Task } from "@/lib/constants";
import { feeCurrencyFor } from "@/lib/tx";
import { useMiniPay } from "@/hooks/useMiniPay";
import { useTaskPayAddress } from "@/hooks/useTaskPayAddress";
import { ContractNotDeployed } from "@/components/ContractNotDeployed";
import { TaskCard } from "@/components/TaskCard";
import { LowBalanceNotice } from "@/components/MiniPayGuard";
import { SegmentTabs } from "@/components/SegmentTabs";
import { EmptyState } from "@/components/EmptyState";
import { parseTask, parseTasks } from "@/components/task-utils";
import { getCurrentPosition, sortByDistance, LatLng } from "@/lib/geo";
import { getExplorerUrl } from "@/lib/constants";

type FilterMode = "all" | "nearby";

export default function FeedPage() {
  const { address, chainId } = useMiniPay();
  const taskPayAddress = useTaskPayAddress();
  const [filter, setFilter] = useState<FilterMode>("all");
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [takingId, setTakingId] = useState<bigint | null>(null);
  const [lastTx, setLastTx] = useState<string | null>(null);

  const { data: rawTasks, refetch, isLoading } = useReadContract({
    address: taskPayAddress,
    abi: taskPayAbi,
    functionName: "getOpenTasks",
    query: { enabled: Boolean(taskPayAddress) },
  });

  const { writeContractAsync, data: txHash, isPending } = useWriteContract();
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash: txHash });

  const tasks: Task[] = useMemo(() => {
    const parsed = parseTasks(rawTasks as readonly Parameters<typeof parseTask>[0][] | undefined);
    if (filter === "nearby" && userLocation) {
      return sortByDistance(parsed, userLocation);
    }
    return parsed;
  }, [rawTasks, filter, userLocation]);

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
    if (!taskPayAddress || !address) return;
    setTakingId(taskId);
    try {
      const hash = await writeContractAsync({
        address: taskPayAddress,
        abi: taskPayAbi,
        functionName: "takeTask",
        args: [taskId],
        ...feeCurrencyFor(chainId),
      });
      setLastTx(hash);
      await refetch();
    } catch (err) {
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
          Live on Celo
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

      {!taskPayAddress && <ContractNotDeployed />}

      {isLoading && taskPayAddress && (
        <div className="space-y-4 py-2">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton h-44 rounded-2xl" />
          ))}
        </div>
      )}

      {!isLoading && taskPayAddress && tasks.length === 0 && (
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
            taking={takingId === task.id && (isPending || confirming)}
            onTake={handleTake}
          />
        ))}
      </div>

      {lastTx && chainId && (
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
