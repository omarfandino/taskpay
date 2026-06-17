import { getSupabase } from "./supabase";

export type EvidencePhoto = {
  photo_url: string;
  created_at?: string;
};

export async function fetchEvidencePhotos(
  taskId: string | number
): Promise<EvidencePhoto[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("evidence_photos")
    .select("photo_url, created_at")
    .eq("task_id", Number(taskId))
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data as EvidencePhoto[];
}
