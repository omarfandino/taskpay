"use client";

import { useEffect, useState } from "react";
import { Task, TaskStatus } from "@/lib/constants";

export function Countdown({ deadline }: { deadline: bigint }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = Number(deadline) - now;
      if (diff <= 0) {
        setRemaining("Expired");
        return;
      }
      const hours = Math.floor(diff / 3600);
      const mins = Math.floor((diff % 3600) / 60);
      if (hours >= 24) {
        const days = Math.floor(hours / 24);
        setRemaining(`${days}d ${hours % 24}h left`);
      } else if (hours > 0) {
        setRemaining(`${hours}h ${mins}m left`);
      } else {
        setRemaining(`${mins}m left`);
      }
    };

    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [deadline]);

  return (
    <span className="text-sm text-muted-foreground">{remaining}</span>
  );
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const styles: Record<TaskStatus, string> = {
    [TaskStatus.Open]: "bg-primary/15 text-primary ring-primary/25",
    [TaskStatus.Taken]: "bg-white/10 text-foreground ring-white/15",
    [TaskStatus.Completed]: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25",
    [TaskStatus.Cancelled]: "bg-muted text-muted-foreground ring-border",
  };

  const labels: Record<TaskStatus, string> = {
    [TaskStatus.Open]: "Open",
    [TaskStatus.Taken]: "Taken",
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
