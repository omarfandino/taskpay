"use client";

import Link from "next/link";
import { MapPin, Clock, Coins, ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Task,
  formatCopm,
  getMapUrl,
  TaskStatus,
} from "@/lib/constants";
import {
  CountdownFromProvider,
  DeadlineProgressBar,
  DeadlineProvider,
  StatusBadge,
} from "@/components/task-utils";

type TaskCardProps = {
  task: Task;
  showTake?: boolean;
  onTake?: (taskId: bigint) => void;
  taking?: boolean;
  linkToDetail?: boolean;
};

export function TaskCard({
  task,
  showTake = false,
  onTake,
  taking = false,
  linkToDetail = true,
}: TaskCardProps) {
  const content = (
    <article className="block-card overflow-hidden transition-colors duration-200 hover:border-primary/80">
      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <p className="font-heading text-[15px] font-bold leading-snug text-foreground">
            {task.description}
          </p>
          {task.status !== TaskStatus.Open && (
            <StatusBadge status={task.status} />
          )}
        </div>

        <div className="reward-chip">
          <Coins className="h-4 w-4 text-primary" aria-hidden />
          <span className="reward-display text-lg">
            {formatCopm(task.reward)} COPm
          </span>
        </div>

        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="line-clamp-2">{task.location}</span>
          </div>
          {task.status === TaskStatus.Open && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
              <CountdownFromProvider />
            </div>
          )}
        </div>
      </div>

      {task.status === TaskStatus.Open && <DeadlineProgressBar />}

      <div className="flex flex-col gap-3 bg-muted/50 px-4 py-3">
        <a
          href={getMapUrl(task.location)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-primary underline-offset-2 transition-colors duration-200 hover:text-primary/80 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          View on map
        </a>
        {showTake && task.status === TaskStatus.Open && onTake && (
          <Button
            className="min-h-[48px] w-full gap-2 rounded-xl text-base font-bold transition-colors duration-200 shadow-glow"
            disabled={taking}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onTake(task.id);
            }}
          >
            <Zap className="h-4 w-4" aria-hidden />
            {taking ? "Taking task…" : "Take task"}
          </Button>
        )}
        {linkToDetail && !showTake && (
          <span className="flex items-center justify-center gap-1 text-xs font-semibold text-primary">
            View details
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </article>
  );

  const card = content;

  if (showTake) {
    if (task.status === TaskStatus.Open) {
      return (
        <DeadlineProvider deadline={task.deadline}>{card}</DeadlineProvider>
      );
    }
    return card;
  }

  if (linkToDetail) {
    const wrapped = (
      <Link
        href={`/task/${task.id.toString()}`}
        className="block cursor-pointer"
      >
        {content}
      </Link>
    );

    if (task.status === TaskStatus.Open) {
      return (
        <DeadlineProvider deadline={task.deadline}>{wrapped}</DeadlineProvider>
      );
    }
    return wrapped;
  }

  if (task.status === TaskStatus.Open) {
    return (
      <DeadlineProvider deadline={task.deadline}>{content}</DeadlineProvider>
    );
  }

  return content;
}
