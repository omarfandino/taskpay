import { getSupabase } from "./supabase";

export type EvidencePhoto = {
  photo_url: string;
  uploader_address?: string;
  created_at?: string;
};

export async function fetchEvidencePhotos(
  taskId: string | number,
  takerAddress?: string
): Promise<EvidencePhoto[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("evidence_photos")
    .select("photo_url, uploader_address, created_at")
    .eq("task_id", Number(taskId))
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  const photos = data as EvidencePhoto[];
  if (!takerAddress) return photos;

  const taker = takerAddress.toLowerCase();
  return photos.filter(
    (p) => p.uploader_address?.toLowerCase() === taker
  );
}

export async function deleteEvidencePhoto(
  taskId: string | number,
  uploaderAddress: string,
  photoUrl: string
): Promise<void> {
  const response = await fetch("/api/delete-evidence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      taskId: String(taskId),
      photoUrl,
      uploaderAddress,
    }),
  });

  const raw = await response.text();
  let payload: { ok?: boolean; error?: string };
  try {
    payload = JSON.parse(raw) as { ok?: boolean; error?: string };
  } catch {
    throw new Error(`Could not delete photo (server ${response.status}).`);
  }

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Could not delete photo.");
  }
}
