import { getSupabase } from "./supabase";

export type TaskAnswer = {
  answer_text: string;
  answer_url?: string | null;
  uploader_address?: string;
  updated_at?: string;
};

const MAX_ANSWER_LENGTH = 500;

export function normalizeAnswerText(text: string): string {
  return text.trim().slice(0, MAX_ANSWER_LENGTH);
}

export async function fetchTaskAnswer(
  taskId: string | number,
  takerAddress?: string
): Promise<TaskAnswer | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  let query = supabase
    .from("task_answers")
    .select("answer_text, answer_url, uploader_address, updated_at")
    .eq("task_id", Number(taskId));

  if (takerAddress) {
    query = query.eq("uploader_address", takerAddress.toLowerCase());
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return data as TaskAnswer;
}

export async function saveTaskAnswer(
  taskId: string | number,
  uploaderAddress: string,
  answerText: string
): Promise<{ answerUrl: string | null }> {
  const normalized = normalizeAnswerText(answerText);
  if (!normalized) {
    throw new Error("Write an answer or add a photo before completing.");
  }

  const response = await fetch("/api/save-answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      taskId: String(taskId),
      uploaderAddress,
      answerText: normalized,
    }),
  });

  const raw = await response.text();
  let payload: { answerUrl?: string | null; error?: string };
  try {
    payload = JSON.parse(raw) as { answerUrl?: string | null; error?: string };
  } catch {
    throw new Error(`Could not save answer (server ${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(payload.error || "Could not save answer.");
  }

  return { answerUrl: payload.answerUrl ?? null };
}
