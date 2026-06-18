"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import {
  TaskStatus,
  formatCopm,
  getMapEmbedUrl,
  getMapUrl,
  getExplorerUrl,
} from "@/lib/constants";
import { DEMO_STORAGE_MODE } from "@/lib/demo-config";
import { isDemoSeedTask, demoSubmitEvidence } from "@/lib/demo-store";
import { useMiniPay } from "@/hooks/useMiniPay";
import { useTaskById, useTaskPayAvailable } from "@/hooks/useTaskPayReads";
import { useTaskPayActions } from "@/hooks/useTaskPayActions";
import { ContractNotDeployed } from "@/components/ContractNotDeployed";
import { EvidenceUploadButton } from "@/components/EvidenceUploadButton";
import { Countdown, StatusBadge, TaskStatusPanel } from "@/components/task-utils";
import { uploadEvidencePhoto } from "@/lib/uploadEvidence";
import { fetchEvidencePhotos } from "@/lib/evidencePhotos";
import { getDemoEvidenceUrls } from "@/lib/demo-store";
import { Button } from "@/components/ui/button";
import { zeroAddress } from "viem";

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = BigInt(params.id as string);
  const { address, chainId } = useMiniPay();
  const taskPayAvailable = useTaskPayAvailable();

  const [uploading, setUploading] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);
  const [simulated, setSimulated] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [remotePhotos, setRemotePhotos] = useState<string[]>([]);
  const [photosVersion, setPhotosVersion] = useState(0);

  const { task, refetch } = useTaskById(taskId);
  const {
    completeTask,
    approveTask,
    rejectTask,
    cancelTask,
    isPending,
  } = useTaskPayActions();

  const isPoster =
    task && address && task.poster.toLowerCase() === address.toLowerCase();
  const isTaker =
    task &&
    address &&
    task.taker.toLowerCase() === address.toLowerCase() &&
    task.taker !== zeroAddress;

  useEffect(() => {
    if (!task) return;

    async function loadPhotos() {
      const taker =
        task!.taker !== zeroAddress ? task!.taker : undefined;
      const fromSupabase = (
        await fetchEvidencePhotos(task!.id.toString(), taker)
      ).map((p) => p.photo_url);
      const fromDemo = DEMO_STORAGE_MODE ? getDemoEvidenceUrls(task!.id) : [];
      const merged = [...new Set([...fromDemo, ...fromSupabase])];
      setRemotePhotos(merged);
    }

    void loadPhotos();
  }, [task, photosVersion]);

  const evidencePhotos = useMemo(() => {
    const urls = [...remotePhotos];
    if (task?.evidenceUrl && !urls.includes(task.evidenceUrl)) {
      urls.push(task.evidenceUrl);
    }
    return urls;
  }, [remotePhotos, task?.evidenceUrl]);

  async function handleEvidenceUpload(file: File) {
    if (!taskPayAvailable || !address || !task) {
      alert("Connect your MiniPay wallet and open a task you have taken.");
      return;
    }

    if (!isTaker || task.status !== TaskStatus.Taken) {
      alert("You can only add evidence while the task is in progress.");
      return;
    }

    setUploading(true);
    setStatusMsg("Reading photo…");
    try {
      setStatusMsg("Uploading photo…");
      const url = await uploadEvidencePhoto(task.id.toString(), address, file);

      if (DEMO_STORAGE_MODE) {
        demoSubmitEvidence(taskId, address, url);
      }

      setStatusMsg("Photo added! (no gas — saved off-chain)");
      setPhotosVersion((v) => v + 1);
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Could not upload evidence.";
      setStatusMsg(message);
      alert(message);
    } finally {
      setUploading(false);
    }
  }

  async function handleMarkComplete() {
    if (!taskPayAvailable || !address || !task) return;
    if (!hasEvidence) {
      alert("Add at least one photo before completing.");
      return;
    }

    const primaryUrl = evidencePhotos[0];
    if (!primaryUrl) return;

    try {
      setStatusMsg("Completing task on-chain…");
      const hash = await completeTask(taskId, primaryUrl);
      if (hash === "demo-simulated") {
        setSimulated(true);
        setLastTx(null);
      } else if (hash) {
        setSimulated(false);
        setLastTx(hash);
      }
      setStatusMsg("Task submitted for review!");
      refetch();
    } catch (err) {
      console.error(err);
      setStatusMsg("Complete failed.");
      alert(
        "Could not complete task. Check you have USDC or another stablecoin for network fees."
      );
    }
  }

  async function handleApprove() {
    if (!taskPayAvailable) return;
    try {
      const hash = await approveTask(taskId);
      if (hash === "demo-simulated") {
        setSimulated(true);
        setLastTx(null);
      } else if (hash) {
        setSimulated(false);
        setLastTx(hash);
      }
      refetch();
    } catch (err) {
      console.error(err);
      alert("Approval failed.");
    }
  }

  async function handleReject() {
    if (!taskPayAvailable) return;
    if (!confirm("Reject this task? COPm will be refunded to you.")) return;
    try {
      const hash = await rejectTask(taskId);
      if (hash === "demo-simulated") {
        setSimulated(true);
        setLastTx(null);
      } else if (hash) {
        setSimulated(false);
        setLastTx(hash);
      }
      refetch();
    } catch (err) {
      console.error(err);
      alert("Reject failed.");
    }
  }

  async function handleCancel() {
    if (!taskPayAvailable) return;
    try {
      const hash = await cancelTask(taskId);
      if (hash === "demo-simulated") {
        setSimulated(true);
        setLastTx(null);
      } else if (hash) {
        setSimulated(false);
        setLastTx(hash);
      }
      refetch();
    } catch (err) {
      console.error(err);
      alert("Cancel failed.");
    }
  }

  if (!taskPayAvailable) {
    return (
      <div className="page-shell mx-auto max-w-lg px-4 pb-28 pt-5">
        <ContractNotDeployed />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="page-shell mx-auto max-w-lg px-4 pb-28 pt-5 text-center text-muted-foreground">
        <div className="skeleton mx-auto h-8 w-48 rounded-lg" />
        <div className="skeleton mx-auto mt-4 h-24 w-full rounded-2xl" />
      </div>
    );
  }

  const busy = isPending;
  const hasEvidence = evidencePhotos.length > 0;
  const demoSeedReview =
    DEMO_STORAGE_MODE &&
    isDemoSeedTask(task.poster) &&
    task.status === TaskStatus.PendingReview;

  return (
    <div className="page-shell mx-auto max-w-lg px-4 pb-28 pt-4 space-y-5">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to feed
      </Link>

      <div className="flex items-start justify-between gap-3">
        <h2 className="font-heading text-xl font-extrabold leading-snug flex-1">
          {task.description}
        </h2>
        <StatusBadge status={task.status} />
      </div>

      <TaskStatusPanel
        task={task}
        isTaker={Boolean(isTaker)}
        isPoster={Boolean(isPoster)}
      />

      <div className="reward-chip rounded-2xl p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Reward
        </p>
        <p className="font-heading text-4xl font-extrabold tracking-tight text-primary">
          {formatCopm(task.reward)}{" "}
          <span className="text-2xl">COPm</span>
        </p>
        {task.status === TaskStatus.Open && (
          <div className="mt-2">
            <Countdown deadline={task.deadline} />
          </div>
        )}
      </div>

      <div className="block-card p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <MapPin className="h-4 w-4 text-primary" />
          Location
        </div>
        <p className="mt-2 font-medium leading-snug">{task.location}</p>
        <a
          href={getMapUrl(task.location)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm font-semibold text-primary"
        >
          Open in Google Maps →
        </a>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/50 aspect-video shadow-card">
        <iframe
          title="Task location map"
          src={getMapEmbedUrl(task.location)}
          className="h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      {hasEvidence && (
        <div className="block-card p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">
            Evidence photos ({evidencePhotos.length})
          </p>
          <div className="grid grid-cols-2 gap-3">
            {evidencePhotos.map((url) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={url}
                src={url}
                alt="Task evidence"
                className="aspect-square w-full rounded-xl border object-cover"
              />
            ))}
          </div>
        </div>
      )}

      {isTaker && task.status === TaskStatus.Taken && (
        <>
          <EvidenceUploadButton
            disabled={uploading || busy}
            uploading={uploading}
            statusMsg={statusMsg}
            onFileSelected={handleEvidenceUpload}
          />
          <Button
            type="button"
            className="h-14 w-full gap-2 rounded-2xl text-base font-bold shadow-glow"
            disabled={busy || !hasEvidence}
            onClick={handleMarkComplete}
          >
            <CheckCircle2 className="h-5 w-5" />
            {busy ? "Processing…" : "Mark task complete"}
          </Button>
        </>
      )}

      {isPoster && task.status === TaskStatus.PendingReview && !demoSeedReview && (
        <div className="grid gap-3">
          <Button
            className="h-14 w-full rounded-2xl text-base font-bold shadow-glow"
            disabled={busy}
            onClick={() => handleApprove()}
          >
            {busy ? "Processing…" : "Approve & pay"}
          </Button>
          <Button
            variant="outline"
            className="h-12 w-full rounded-2xl border-red-500/40 bg-red-500/10 text-base font-bold text-red-400 hover:bg-red-500/20"
            disabled={busy}
            onClick={() => handleReject()}
          >
            Reject (refund COPm)
          </Button>
        </div>
      )}

      {demoSeedReview && (
        <div className="space-y-3 rounded-2xl border border-border bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Demo poster review.</strong>{" "}
            Check the evidence photos above, then approve or reject — same as a
            real poster would on production.
          </p>
          <Button
            className="h-14 w-full rounded-2xl text-base font-bold shadow-glow"
            disabled={busy}
            onClick={async () => {
              try {
                await approveTask(taskId, true);
                refetch();
              } catch {
                alert("Approval failed.");
              }
            }}
          >
            {busy ? "Processing…" : "Approve & pay"}
          </Button>
          <Button
            variant="outline"
            className="h-12 w-full rounded-2xl border-red-500/40 bg-red-500/10 text-base font-bold text-red-400 hover:bg-red-500/20"
            disabled={busy}
            onClick={async () => {
              if (!confirm("Reject this work? COPm returns to the demo poster."))
                return;
              try {
                await rejectTask(taskId, true);
                refetch();
              } catch {
                alert("Reject failed.");
              }
            }}
          >
            Reject (refund COPm)
          </Button>
        </div>
      )}

      {!address && task.status === TaskStatus.Taken && (
        <p className="text-center text-sm text-muted-foreground">
          Connect your wallet to upload evidence.
        </p>
      )}

      {isPoster && task.status === TaskStatus.Open && (
        <Button
          variant="outline"
          className="w-full h-12 rounded-2xl border-border bg-muted text-foreground hover:bg-muted/80"
          disabled={busy}
          onClick={handleCancel}
        >
          Cancel task (refund COPm)
        </Button>
      )}

      {statusMsg && !uploading && task.status === TaskStatus.Taken && (
        <p
          className={`text-center text-sm ${
            statusMsg.includes("failed") ? "text-red-400" : "text-emerald-400"
          }`}
        >
          {statusMsg}
        </p>
      )}

      {simulated && (
        <p className="text-center text-sm text-muted-foreground">
          Simulated — no on-chain transaction
        </p>
      )}

      {lastTx && chainId && !simulated && (
        <p className="text-center text-sm">
          <a
            href={getExplorerUrl(chainId, lastTx)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline"
          >
            View on Celoscan
          </a>
        </p>
      )}
    </div>
  );
}
