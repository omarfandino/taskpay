function collectErrorText(err: unknown): string {
  if (err instanceof Error) {
    const parts = [err.message];
    if ("shortMessage" in err && typeof err.shortMessage === "string") {
      parts.push(err.shortMessage);
    }
    const cause = (err as Error & { cause?: unknown }).cause;
    if (cause) parts.push(collectErrorText(cause));
    return parts.join(" ");
  }
  return String(err);
}

/** Contract reverts with TaskNotOpen when another wallet took the task first. */
export function isTaskNotOpenError(err: unknown): boolean {
  return collectErrorText(err).includes("TaskNotOpen");
}

export function getTakeTaskErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message === "Could not take task.") {
    return err.message;
  }
  if (isTaskNotOpenError(err)) {
    return "Someone else just took this task. Check the feed for other open jobs.";
  }
  return "Failed to take task. Check your balance and try again.";
}

/** User-facing message for failed on-chain actions (approve, reject, complete, etc.). */
export function getTxErrorMessage(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : fallback;
  if (message.includes("User rejected")) return "Transaction cancelled.";
  if (message.includes("insufficient funds") || message.includes("gas")) {
    return `${fallback} Check you have enough balance for network fees.`;
  }
  return message || fallback;
}
