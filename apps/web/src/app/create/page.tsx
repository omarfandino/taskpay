"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { taskPayAbi, erc20Abi } from "@/lib/taskpay-abi";
import { MIN_REWARD_COPM, parseCopm, getExplorerUrl } from "@/lib/constants";
import { feeCurrencyFor, getCopmAddress } from "@/lib/tx";
import { useMiniPay } from "@/hooks/useMiniPay";
import { useTaskPayAddress } from "@/hooks/useTaskPayAddress";
import { ContractNotDeployed } from "@/components/ContractNotDeployed";
import { LocationField } from "@/components/LocationField";
import { resolveLocationInput } from "@/lib/location";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from "lucide-react";

const LowBalanceNotice = dynamic(
  () =>
    import("@/components/MiniPayGuard").then((m) => ({
      default: m.LowBalanceNotice,
    })),
  { ssr: false }
);

const DEADLINE_OPTIONS = [
  { label: "1 hour", hours: 1 },
  { label: "6 hours", hours: 6 },
  { label: "24 hours", hours: 24 },
  { label: "3 days", hours: 72 },
];

export default function CreatePage() {
  const { address, chainId, mounted } = useMiniPay();
  const taskPayAddress = useTaskPayAddress();

  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [location, setLocation] = useState("");
  const [deadlineHours, setDeadlineHours] = useState(24);
  const [status, setStatus] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const copmAddress = getCopmAddress(chainId);
  const rewardAmount = parseCopm(reward);

  const { data: allowance } = useReadContract({
    address: copmAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args:
      address && taskPayAddress
        ? [address, taskPayAddress]
        : undefined,
    query: { enabled: Boolean(mounted && address && taskPayAddress) },
  });

  const { writeContractAsync, data: txHash, isPending } = useWriteContract();
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash: txHash });

  async function handlePublish() {
    if (!taskPayAddress || !address) return;
    if (description.length === 0 || description.length > 280) {
      alert("Description must be 1–280 characters.");
      return;
    }
    if (rewardAmount < parseCopm(String(MIN_REWARD_COPM))) {
      alert(`Minimum reward is ${MIN_REWARD_COPM} COPm.`);
      return;
    }

    if (!location.trim()) {
      alert("Please add a location.");
      return;
    }

    setSubmitting(true);
    setStatus("Checking location…");

    try {
      const resolved = await resolveLocationInput(location);
      const finalLocation = resolved.normalized.trim();
      if (!finalLocation) {
        alert("Please add a valid location.");
        return;
      }

      const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineHours * 3600);

      const needsApproval =
        allowance === undefined || (allowance as bigint) < rewardAmount;

      if (needsApproval) {
        setStatus("Approving COPm…");
        await writeContractAsync({
          address: copmAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [taskPayAddress, rewardAmount],
          ...feeCurrencyFor(chainId),
        });
      }

      setStatus("Posting task…");
      const hash = await writeContractAsync({
        address: taskPayAddress,
        abi: taskPayAbi,
        functionName: "postTask",
        args: [description.trim(), finalLocation, deadline, rewardAmount],
        ...feeCurrencyFor(chainId),
      });

      setLastTx(hash);
      setStatus("Task posted!");
      setDescription("");
      setReward("");
      setLocation("");
    } catch (err) {
      console.error(err);
      setStatus("Failed. Try again.");
      alert("Transaction failed. Check COPm balance and USDm for network fees.");
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || isPending || confirming;

  return (
    <div className="page-shell mx-auto max-w-lg px-4 pb-28 pt-5">
      <PageHeader
        title="Post a task"
        subtitle="Set a COPm reward and someone nearby will complete it."
      />

      {!taskPayAddress && <ContractNotDeployed />}
      {mounted && address && <LowBalanceNotice />}

      <div className="space-y-5 block-card p-5">
        <div>
          <label className="text-sm font-medium text-foreground">Description</label>
          <textarea
            className="input-field mt-1.5 min-h-[120px] resize-none py-3"
            disabled={busy}
            placeholder="e.g. Is there a sportswear store on Calle 5? Need a photo of the storefront."
            maxLength={280}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {description.length}/280
          </p>
        </div>

        <div>
          <label className="text-sm font-medium">Reward (COPm)</label>
          <input
            type="number"
            min={MIN_REWARD_COPM}
            step="1"
            className="input-field h-12"
            disabled={busy}
            placeholder={`Min ${MIN_REWARD_COPM} COPm`}
            value={reward}
            onChange={(e) => setReward(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-primary" aria-hidden />
            Task location
          </label>
          <div className="mt-1.5">
            <LocationField
              value={location}
              onChange={setLocation}
              disabled={busy}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Deadline</label>
          <select
            className="input-field h-12"
            disabled={busy}
            value={deadlineHours}
            onChange={(e) => setDeadlineHours(Number(e.target.value))}
          >
            {DEADLINE_OPTIONS.map((opt) => (
              <option key={opt.hours} value={opt.hours}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <Button
          className="min-h-[48px] w-full gap-2 rounded-xl text-base font-bold shadow-glow transition-colors duration-200 disabled:opacity-70"
          disabled={busy || !taskPayAddress || !address}
          onClick={handlePublish}
        >
          {busy && (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          )}
          {busy ? status || "Processing…" : "Publish task"}
        </Button>

        {status && !busy && (
          <p className="text-center text-sm text-emerald-400">{status}</p>
        )}

        {lastTx && chainId && (
          <p className="text-center text-sm">
            <a
              href={getExplorerUrl(chainId, lastTx)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              View on Celoscan
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
