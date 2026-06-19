"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { CheckCircle2 } from "lucide-react";
import { Task, TaskStatus, formatCopm } from "@/lib/constants";
import { Button } from "@/components/ui/button";

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return "Expired";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h left`;
  }
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

function useDeadlineState(deadline: bigint) {
  const totalRef = useRef<number | null>(null);
  const [label, setLabel] = useState("");
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    totalRef.current = null;

    const update = () => {
      const remaining = Number(deadline) - Math.floor(Date.now() / 1000);
      if (remaining <= 0) {
        setLabel("Expired");
        setProgress(0);
        return;
      }
      if (totalRef.current === null) {
        totalRef.current = remaining;
      }
      const total = totalRef.current;
      setLabel(formatRemaining(remaining));
      setProgress(Math.max(0, Math.min(100, (remaining / total) * 100)));
    };

    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [deadline]);

  return { label, progress };
}

type DeadlineContextValue = { label: string; progress: number };

const DeadlineContext = createContext<DeadlineContextValue | null>(null);

export function DeadlineProvider({
  deadline,
  children,
}: {
  deadline: bigint;
  children: React.ReactNode;
}) {
  const state = useDeadlineState(deadline);
  return (
    <DeadlineContext.Provider value={state}>{children}</DeadlineContext.Provider>
  );
}

export function Countdown({ deadline }: { deadline: bigint }) {
  const { label } = useDeadlineState(deadline);
  return <span className="text-sm text-muted-foreground">{label}</span>;
}

export function CountdownFromProvider() {
  const ctx = useContext(DeadlineContext);
  if (!ctx) return null;
  return <span className="text-sm text-muted-foreground">{ctx.label}</span>;
}

export function DeadlineProgressBar() {
  const ctx = useContext(DeadlineContext);
  if (!ctx) return null;

  return (
    <div
      className="h-0.5 w-full bg-border"
      role="progressbar"
      aria-valuenow={Math.round(ctx.progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Time remaining"
    >
      <div
        className="ml-auto h-full bg-primary transition-[width] duration-[30s] ease-linear"
        style={{ width: `${ctx.progress}%` }}
      />
    </div>
  );
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const styles: Record<TaskStatus, string> = {
    [TaskStatus.Open]: "bg-primary/15 text-primary ring-primary/25",
    [TaskStatus.Taken]: "bg-white/10 text-foreground ring-white/15",
    [TaskStatus.PendingReview]:
      "bg-amber-500/15 text-amber-400 ring-amber-500/25",
    [TaskStatus.Completed]: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25",
    [TaskStatus.Cancelled]: "bg-muted text-muted-foreground ring-border",
  };

  const labels: Record<TaskStatus, string> = {
    [TaskStatus.Open]: "Open",
    [TaskStatus.Taken]: "In progress",
    [TaskStatus.PendingReview]: "Pending review",
    [TaskStatus.Completed]: "Completed",
    [TaskStatus.Cancelled]: "Cancelled",
  };

  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ring-1 ring-inset ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export function TaskStatusPanel({
  task,
  isTaker,
  isPoster,
}: {
  task: Task;
  isTaker: boolean;
  isPoster: boolean;
}) {
  if (task.status === TaskStatus.Completed) {
    return (
      <div className="space-y-2">
        <Button
          type="button"
          disabled
          className="h-14 w-full gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/15 text-base font-bold text-emerald-400 opacity-100"
        >
          <CheckCircle2 className="h-5 w-5" />
          Task completed
        </Button>
        {isTaker && (
          <p className="text-center text-sm text-emerald-400/90">
            You earned {formatCopm(task.reward)} COPm
          </p>
        )}
        {isPoster && !isTaker && (
          <p className="text-center text-sm text-muted-foreground">
            Payment sent to the taker
          </p>
        )}
      </div>
    );
  }

  if (task.status === TaskStatus.Cancelled) {
    return (
      <Button
        type="button"
        disabled
        className="h-12 w-full rounded-2xl border border-border bg-muted text-base font-bold text-muted-foreground opacity-100"
      >
        Task rejected — COPm refunded to poster
      </Button>
    );
  }

  if (task.status === TaskStatus.PendingReview) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-center">
        <p className="font-bold text-amber-400">Waiting for poster review</p>
        {isTaker && (
          <p className="mt-1 text-sm text-muted-foreground">
            You marked this task complete. The poster will approve or reject.
          </p>
        )}
        {isPoster && (
          <p className="mt-1 text-sm text-muted-foreground">
            Review the evidence below, then approve or reject.
          </p>
        )}
      </div>
    );
  }

  if (task.status === TaskStatus.Taken && isTaker) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Upload your evidence photos, then tap <strong>Mark task complete</strong>.
      </p>
    );
  }

  if (task.status === TaskStatus.Taken && !isTaker && !isPoster) {
    return (
      <div className="rounded-2xl border border-border bg-muted/50 p-4 text-center">
        <p className="font-bold text-foreground">
          This task is no longer available
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Someone else is working on it. Check the feed for other open jobs.
        </p>
      </div>
    );
  }

  return null;
}

type TaskStruct = {
  id: bigint;
  poster: `0x${string}`;
  taker: `0x${string}`;
  description: string;
  location: string;
  reward: bigint;
  deadline: bigint;
  status: number;
  evidenceUrl: string;
};

type RawTask = readonly unknown[] | TaskStruct;

function isTaskStruct(raw: RawTask): raw is TaskStruct {
  return !Array.isArray(raw);
}

export function parseTask(raw: RawTask): Task {
  if (Array.isArray(raw)) {
    return {
      id: raw[0] as bigint,
      poster: raw[1] as `0x${string}`,
      taker: raw[2] as `0x${string}`,
      description: raw[3] as string,
      location: raw[4] as string,
      reward: raw[5] as bigint,
      deadline: raw[6] as bigint,
      status: raw[7] as TaskStatus,
      evidenceUrl: raw[8] as string,
    };
  }

  if (isTaskStruct(raw)) {
    return {
      id: raw.id,
      poster: raw.poster,
      taker: raw.taker,
      description: raw.description,
      location: raw.location,
      reward: raw.reward,
      deadline: raw.deadline,
      status: raw.status as TaskStatus,
      evidenceUrl: raw.evidenceUrl,
    };
  }

  throw new Error("Invalid task data");
}

export function parseTasks(raw: readonly RawTask[] | undefined): Task[] {
  if (!raw) return [];
  return raw.map(parseTask);
}
