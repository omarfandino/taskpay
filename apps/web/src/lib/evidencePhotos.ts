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
