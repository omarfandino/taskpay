"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import {
  TaskStatus,
  formatCopm,
  getMapEmbedUrl,
  getMapUrl,
  getExplorerUrl,
} from "@/lib/constants";
import { DEMO_STORAGE_MODE } from "@/lib/demo-config";
import { isDemoSeedTask, demoSubmitEvidence, demoRemoveEvidence, getDemoTaskAnswer, demoSaveTaskAnswer } from "@/lib/demo-store";
import { useMiniPay } from "@/hooks/useMiniPay";
import { useTaskById, useTaskPayAvailable } from "@/hooks/useTaskPayReads";
import { useTaskPayActions } from "@/hooks/useTaskPayActions";
import { ContractNotDeployed } from "@/components/ContractNotDeployed";
import { EvidenceUploadButton } from "@/components/EvidenceUploadButton";
import { Countdown, StatusBadge, TaskStatusPanel } from "@/components/task-utils";
import { uploadEvidencePhoto } from "@/lib/uploadEvidence";
import { fetchEvidencePhotos, deleteEvidencePhoto } from "@/lib/evidencePhotos";
import {
  dedupeEvidenceUrls,
  evidenceUrlKey,
  evidenceUrlsMatch,
  isAnswerEvidenceUrl,
} from "@/lib/evidenceUrl";
import { useTaskPayViewRefreshOnMount } from "@/hooks/useTaskPayViewRefreshOnMount";
import { useRefreshTaskPayViewsAfterTx } from "@/hooks/useInvalidateTaskPayReads";
import { fetchTaskAnswer, saveTaskAnswer } from "@/lib/taskAnswers";
import { getDemoEvidenceUrls } from "@/lib/demo-store";
import { Button } from "@/components/ui/button";
import { zeroAddress } from "viem";

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = BigInt(params.id as string);
  const { address, chainId } = useMiniPay();
  const taskPayAvailable = useTaskPayAvailable();
  const refreshViewsAfterTx = useRefreshTaskPayViewsAfterTx();

  useTaskPayViewRefreshOnMount(taskPayAvailable);

  const [uploading, setUploading] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);
  const [simulated, setSimulated] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [remotePhotos, setRemotePhotos] = useState<string[]>([]);
  const [photosVersion, setPhotosVersion] = useState(0);
  const [removedPhotoKeys, setRemovedPhotoKeys] = useState<string[]>([]);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);
  const [confirmDeleteUrl, setConfirmDeleteUrl] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [savedAnswerText, setSavedAnswerText] = useState("");
  const [answerUrl, setAnswerUrl] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "reject" | "cancel" | "demoReject" | null
  >(null);
  const photosLoadIdRef = useRef(0);

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

    const loadId = ++photosLoadIdRef.current;

    async function loadPhotos() {
      const taker =
        task!.taker !== zeroAddress ? task!.taker : undefined;
      const fromSupabase = (
        await fetchEvidencePhotos(task!.id.toString(), taker)
      ).map((p) => p.photo_url);
      const fromDemo = DEMO_STORAGE_MODE ? getDemoEvidenceUrls(task!.id) : [];
      const merged = dedupeEvidenceUrls([...fromDemo, ...fromSupabase]);

      if (loadId !== photosLoadIdRef.current) return;
      setRemotePhotos(merged);
    }

    void loadPhotos();
  }, [task, photosVersion]);

  useEffect(() => {
    if (!task) return;

    let cancelled = false;

    async function loadAnswer() {
      if (DEMO_STORAGE_MODE) {
        const demo = getDemoTaskAnswer(task!.id);
        if (cancelled) return;
        setAnswerText(demo);
        setSavedAnswerText(demo);
        setAnswerUrl(null);
        return;
      }

      const taker =
        task!.taker !== zeroAddress ? task!.taker : undefined;
      const row = await fetchTaskAnswer(task!.id.toString(), taker);
      if (cancelled) return;
      const text = row?.answer_text?.trim() ?? "";
      setAnswerText(text);
      setSavedAnswerText(text);
      setAnswerUrl(row?.answer_url ?? null);
    }

    void loadAnswer();
    return () => {
      cancelled = true;
    };
  }, [task?.id, task?.taker]);

  const evidencePhotos = useMemo(() => {
    const removed = new Set(removedPhotoKeys);
    const merged = dedupeEvidenceUrls([
      ...remotePhotos,
      ...(task?.evidenceUrl ? [task.evidenceUrl] : []),
    ]);
    return merged.filter(
      (url) =>
        !removed.has(evidenceUrlKey(url)) && !isAnswerEvidenceUrl(url)
    );
  }, [remotePhotos, task?.evidenceUrl, removedPhotoKeys]);

  const canComplete =
    evidencePhotos.length > 0 || answerText.trim().length > 0;

  async function handleEvidenceUpload(file: File) {
    if (!taskPayAvailable || !address || !task) {
      alert("Connect your wallet to upload evidence.");
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

  async function handleEvidenceDelete(photoUrl: string) {
    if (!taskPayAvailable || !address || !task) return;
    if (!isTaker || task.status !== TaskStatus.Taken) return;
    if (
      task.evidenceUrl &&
      evidenceUrlsMatch(task.evidenceUrl, photoUrl)
    ) {
      alert("This photo is already on-chain and cannot be removed.");
      return;
    }

    setDeletingUrl(photoUrl);
    setConfirmDeleteUrl(null);
    try {
      if (DEMO_STORAGE_MODE) {
        demoRemoveEvidence(taskId, address, photoUrl);
      } else {
        await deleteEvidencePhoto(task.id.toString(), address, photoUrl);
      }
      const removedKey = evidenceUrlKey(photoUrl);
      setRemovedPhotoKeys((prev) =>
        prev.includes(removedKey) ? prev : [...prev, removedKey]
      );
      setRemotePhotos((prev) =>
        prev.filter((url) => !evidenceUrlsMatch(url, photoUrl))
      );
      setStatusMsg("Photo removed.");
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Could not delete photo.");
    } finally {
      setDeletingUrl(null);
    }
  }

  async function persistAnswerIfNeeded(): Promise<string | null> {
    const trimmed = answerText.trim();
    if (!trimmed || !address || !task) return null;

    if (DEMO_STORAGE_MODE) {
      demoSaveTaskAnswer(taskId, address, trimmed);
      setSavedAnswerText(trimmed);
      return null;
    }

    if (trimmed === savedAnswerText && answerUrl) return answerUrl;

    const { answerUrl: url } = await saveTaskAnswer(
      task.id.toString(),
      address,
      trimmed
    );
    setSavedAnswerText(trimmed);
    setAnswerUrl(url);
    return url;
  }

  async function resolvePrimaryEvidenceUrl(): Promise<string> {
    const persistedAnswerUrl = await persistAnswerIfNeeded();

    if (evidencePhotos[0]) return evidencePhotos[0];

    const trimmed = answerText.trim();
    if (!trimmed) {
      throw new Error("Add at least one photo or a text answer.");
    }

    if (DEMO_STORAGE_MODE) {
      return `demo-answer://${taskId}`;
    }

    const url = persistedAnswerUrl ?? answerUrl;
    if (!url) throw new Error("Could not store answer.");
    return url;
  }

  async function handleMarkComplete() {
    if (!taskPayAvailable || !address || !task) return;
    if (!canComplete) {
      alert("Add at least one photo or write an answer before completing.");
      return;
    }

    try {
      setCompleting(true);
      setStatusMsg("Completing task on-chain…");
      const primaryUrl = await resolvePrimaryEvidenceUrl();
      const hash = await completeTask(taskId, primaryUrl);
      if (hash === "demo-simulated") {
        setSimulated(true);
        setLastTx(null);
      } else if (hash) {
        setSimulated(false);
        setLastTx(hash);
      }
      setStatusMsg("Task submitted for review!");
      await refreshViewsAfterTx();
      refetch();
      router.push("/my-tasks");
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Could not complete task.";
      setStatusMsg("Complete failed.");
      const isGasHint =
        message.includes("User rejected") ||
        message.includes("insufficient funds") ||
        message.includes("gas");
      alert(
        message.includes("User rejected")
          ? "Transaction cancelled."
          : isGasHint
            ? "Could not complete task. Check you have USDC or another stablecoin for network fees."
            : message
      );
    } finally {
      setCompleting(false);
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
      await refreshViewsAfterTx();
    } catch (err) {
      console.error(err);
      alert("Approval failed.");
    }
  }

  async function handleReject() {
    if (!taskPayAvailable) return;
    setConfirmAction(null);
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
      await refreshViewsAfterTx();
      router.push("/my-tasks");
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Reject failed.";
      alert(
        message.includes("User rejected")
          ? "Transaction cancelled."
          : message.includes("insufficient funds") || message.includes("gas")
            ? "Reject failed. Check you have USDC for network fees."
            : message
      );
    }
  }

  async function handleCancel() {
    if (!taskPayAvailable) return;
    setConfirmAction(null);
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
      await refreshViewsAfterTx();
      router.push("/my-tasks");
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

  const editableEvidence =
    Boolean(isTaker && task.status === TaskStatus.Taken);
  const actionBusy = isPending || completing;
  const inputLocked = uploading || completing || Boolean(deletingUrl);
  const hasEvidence = evidencePhotos.length > 0;
  const showAnswerCard =
    Boolean(savedAnswerText) &&
    !(isTaker && task.status === TaskStatus.Taken);
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
            {evidencePhotos.map((url) => {
              const photoKey = evidenceUrlKey(url);
              const canDelete =
                editableEvidence &&
                (!task.evidenceUrl ||
                  !evidenceUrlsMatch(task.evidenceUrl, url));
              const isConfirming =
                confirmDeleteUrl !== null &&
                evidenceUrlsMatch(confirmDeleteUrl, url);
              const isDeleting =
                deletingUrl !== null && evidenceUrlsMatch(deletingUrl, url);

              return (
                <div key={photoKey} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt="Task evidence"
                    className="aspect-square w-full rounded-xl border object-cover"
                  />
                  {canDelete && (
                    <>
                      {isConfirming ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/75 p-2">
                          <p className="text-center text-xs font-semibold text-white">
                            Remove photo?
                          </p>
                          <div className="flex w-full gap-2">
                            <button
                              type="button"
                              className="min-h-[40px] flex-1 rounded-lg bg-red-500 text-sm font-bold text-white disabled:opacity-50"
                              disabled={Boolean(deletingUrl)}
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleEvidenceDelete(url);
                              }}
                            >
                              {isDeleting ? "…" : "Remove"}
                            </button>
                            <button
                              type="button"
                              className="min-h-[40px] flex-1 rounded-lg bg-white/20 text-sm font-bold text-white"
                              disabled={Boolean(deletingUrl)}
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteUrl(null);
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          aria-label="Remove photo"
                          className="absolute right-2 top-2 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-black/70 text-white shadow-lg disabled:opacity-50"
                          disabled={Boolean(deletingUrl)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteUrl(url);
                          }}
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isTaker && task.status === TaskStatus.Taken && (
        <>
          <EvidenceUploadButton
            disabled={inputLocked || actionBusy}
            uploading={uploading}
            statusMsg={uploading ? statusMsg : null}
            onFileSelected={handleEvidenceUpload}
          />

          <div className="block-card space-y-3 p-4">
            <div>
              <label
                htmlFor="task-answer"
                className="text-sm font-semibold text-foreground"
              >
                Answer{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </label>
              <p className="mt-1 text-xs text-muted-foreground">
                e.g. phone number, store hours, or other details. Photo, text,
                or both — at least one to complete.
              </p>
            </div>
            <textarea
              id="task-answer"
              className="input-field min-h-[100px] resize-none py-3"
              disabled={inputLocked}
              placeholder="e.g. The correct phone number is 300 123 4567"
              maxLength={500}
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {answerText.length}/500
            </p>
          </div>

          <Button
            type="button"
            className="h-14 w-full gap-2 rounded-2xl text-base font-bold shadow-glow"
            disabled={inputLocked || actionBusy || !canComplete}
            onClick={handleMarkComplete}
          >
            <CheckCircle2 className="h-5 w-5" />
            {actionBusy ? "Processing…" : "Mark task complete"}
          </Button>
        </>
      )}

      {showAnswerCard && (
        <div className="block-card p-4">
          <p className="mb-2 text-sm font-semibold text-foreground">Answer</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {savedAnswerText}
          </p>
        </div>
      )}

      {confirmAction === "reject" && (
        <div className="block-card space-y-3 border border-red-500/40 p-4">
          <p className="text-sm font-semibold text-foreground">
            Reject this task?
          </p>
          <p className="text-xs text-muted-foreground">
            COPm will be refunded to your wallet.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              className="h-11 flex-1 rounded-xl bg-red-500 font-bold text-white hover:bg-red-600"
              disabled={actionBusy}
              onClick={() => void handleReject()}
            >
              {actionBusy ? "Processing…" : "Reject"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 rounded-xl font-bold"
              disabled={actionBusy}
              onClick={() => setConfirmAction(null)}
            >
              Back
            </Button>
          </div>
        </div>
      )}

      {isPoster && task.status === TaskStatus.Open && (
        <>
          {confirmAction === "cancel" && (
            <div className="block-card space-y-3 border border-border p-4">
              <p className="text-sm font-semibold text-foreground">
                Cancel this task?
              </p>
              <p className="text-xs text-muted-foreground">
                Your COPm reward will be refunded.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  className="h-11 flex-1 rounded-xl font-bold"
                  disabled={actionBusy}
                  onClick={() => void handleCancel()}
                >
                  {actionBusy ? "Processing…" : "Cancel task"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1 rounded-xl font-bold"
                  disabled={actionBusy}
                  onClick={() => setConfirmAction(null)}
                >
                  Back
                </Button>
              </div>
            </div>
          )}
          <Button
            variant="outline"
            className="w-full h-12 rounded-2xl border-border bg-muted text-foreground hover:bg-muted/80"
            disabled={actionBusy || confirmAction !== null}
            onClick={() => setConfirmAction("cancel")}
          >
            Cancel task (refund COPm)
          </Button>
        </>
      )}

      {isPoster && task.status === TaskStatus.PendingReview && !demoSeedReview && (
        <div className="grid gap-3">
          <Button
            className="h-14 w-full rounded-2xl text-base font-bold shadow-glow"
            disabled={actionBusy || confirmAction !== null}
            onClick={() => handleApprove()}
          >
            {actionBusy ? "Processing…" : "Approve & pay"}
          </Button>
          <Button
            variant="outline"
            className="h-12 w-full rounded-2xl border-red-500/40 bg-red-500/10 text-base font-bold text-red-400 hover:bg-red-500/20"
            disabled={actionBusy || confirmAction !== null}
            onClick={() => setConfirmAction("reject")}
          >
            Reject (refund COPm)
          </Button>
        </div>
      )}

      {confirmAction === "demoReject" && (
        <div className="block-card space-y-3 border border-red-500/40 p-4">
          <p className="text-sm font-semibold text-foreground">
            Reject this work?
          </p>
          <p className="text-xs text-muted-foreground">
            COPm returns to the demo poster.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              className="h-11 flex-1 rounded-xl bg-red-500 font-bold text-white hover:bg-red-600"
              disabled={actionBusy}
              onClick={async () => {
                setConfirmAction(null);
                try {
                  await rejectTask(taskId, true);
                  refetch();
                } catch {
                  alert("Reject failed.");
                }
              }}
            >
              {actionBusy ? "Processing…" : "Reject"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 rounded-xl font-bold"
              disabled={actionBusy}
              onClick={() => setConfirmAction(null)}
            >
              Back
            </Button>
          </div>
        </div>
      )}

      {demoSeedReview && (
        <div className="space-y-3 rounded-2xl border border-border bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Demo poster review.</strong>{" "}
            Check the evidence photos and answer above, then approve or reject —
            same as a real poster would on production.
          </p>
          <Button
            className="h-14 w-full rounded-2xl text-base font-bold shadow-glow"
            disabled={actionBusy}
            onClick={async () => {
              try {
                await approveTask(taskId, true);
                refetch();
              } catch {
                alert("Approval failed.");
              }
            }}
          >
            {actionBusy ? "Processing…" : "Approve & pay"}
          </Button>
          <Button
            variant="outline"
            className="h-12 w-full rounded-2xl border-red-500/40 bg-red-500/10 text-base font-bold text-red-400 hover:bg-red-500/20"
            disabled={actionBusy || confirmAction !== null}
            onClick={() => setConfirmAction("demoReject")}
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
