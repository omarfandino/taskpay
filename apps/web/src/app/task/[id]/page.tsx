"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Camera, MapPin } from "lucide-react";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { taskPayAbi } from "@/lib/taskpay-abi";
import {
  TaskStatus,
  formatCopm,
  getMapEmbedUrl,
  getMapUrl,
  getExplorerUrl,
} from "@/lib/constants";
import { feeCurrencyFor } from "@/lib/tx";
import { useMiniPay } from "@/hooks/useMiniPay";
import { useTaskPayAddress } from "@/hooks/useTaskPayAddress";
import { ContractNotDeployed } from "@/components/ContractNotDeployed";
import { parseTask, Countdown, StatusBadge } from "@/components/task-utils";
import { uploadEvidencePhoto } from "@/lib/uploadEvidence";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { zeroAddress } from "viem";

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = BigInt(params.id as string);
  const { address, chainId } = useMiniPay();
  const taskPayAddress = useTaskPayAddress();

  const [uploading, setUploading] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const { data: rawTask, refetch } = useReadContract({
    address: taskPayAddress,
    abi: taskPayAbi,
    functionName: "getTask",
    args: [taskId],
    query: { enabled: Boolean(taskPayAddress) },
  });

  const { writeContractAsync, data: txHash, isPending } = useWriteContract();
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash: txHash });

  const task = rawTask ? parseTask(rawTask as Parameters<typeof parseTask>[0]) : null;
  const busy = isPending || confirming;

  const isPoster =
    task && address && task.poster.toLowerCase() === address.toLowerCase();
  const isTaker =
    task &&
    address &&
    task.taker.toLowerCase() === address.toLowerCase() &&
    task.taker !== zeroAddress;

  async function handleEvidenceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !taskPayAddress || !address || !task) return;

    if (!isSupabaseConfigured()) {
      alert("Supabase is not configured. Set env vars to upload evidence.");
      return;
    }

    setUploading(true);
    setStatusMsg("Uploading photo…");
    try {
      const url = await uploadEvidencePhoto(task.id.toString(), address, file);
      setStatusMsg("Submitting evidence onchain…");
      const hash = await writeContractAsync({
        address: taskPayAddress,
        abi: taskPayAbi,
        functionName: "submitEvidence",
        args: [taskId, url],
        ...feeCurrencyFor(chainId),
      });
      setLastTx(hash);
      setStatusMsg("Evidence submitted!");
      await refetch();
    } catch (err) {
      console.error(err);
      setStatusMsg("Upload failed.");
      alert("Could not upload evidence. Try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleApprove() {
    if (!taskPayAddress) return;
    try {
      const hash = await writeContractAsync({
        address: taskPayAddress,
        abi: taskPayAbi,
        functionName: "approveTask",
        args: [taskId],
        ...feeCurrencyFor(chainId),
      });
      setLastTx(hash);
      await refetch();
    } catch (err) {
      console.error(err);
      alert("Approval failed.");
    }
  }

  async function handleCancel() {
    if (!taskPayAddress) return;
    try {
      const hash = await writeContractAsync({
        address: taskPayAddress,
        abi: taskPayAbi,
        functionName: "cancelTask",
        args: [taskId],
        ...feeCurrencyFor(chainId),
      });
      setLastTx(hash);
      await refetch();
    } catch (err) {
      console.error(err);
      alert("Cancel failed.");
    }
  }

  if (!taskPayAddress) {
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

      {task.evidenceUrl && (
        <div className="block-card p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">
            Evidence photo
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={task.evidenceUrl}
            alt="Task evidence"
            className="w-full rounded-xl border object-cover max-h-80"
          />
        </div>
      )}

      {isTaker && task.status === TaskStatus.Taken && !task.evidenceUrl && (
        <label className="block">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleEvidenceUpload}
            disabled={uploading || busy}
          />
          <Button
            className="w-full h-14 rounded-2xl text-base font-bold gap-2 shadow-glow"
            disabled={uploading || busy}
            asChild
          >
            <span>
              <Camera className="h-5 w-5" />
              {uploading ? statusMsg || "Uploading…" : "Upload evidence photo"}
            </span>
          </Button>
        </label>
      )}

      {isPoster &&
        task.status === TaskStatus.Taken &&
        task.evidenceUrl.length > 0 && (
          <Button
            className="w-full h-14 rounded-2xl text-base font-bold shadow-glow"
            disabled={busy}
            onClick={handleApprove}
          >
            {busy ? "Processing…" : "Approve & pay"}
          </Button>
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

      {lastTx && chainId && (
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
