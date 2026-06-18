import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function storagePathFromPublicUrl(photoUrl: string): string | null {
  const marker = "/storage/v1/object/public/task-evidence/";
  const index = photoUrl.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(photoUrl.slice(index + marker.length));
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured on the server." },
      { status: 503 }
    );
  }

  const body = (await request.json()) as {
    taskId?: string | number;
    photoUrl?: string;
    uploaderAddress?: string;
  };

  const { taskId, photoUrl, uploaderAddress } = body;
  if (!taskId || !photoUrl || !uploaderAddress) {
    return NextResponse.json(
      { error: "Missing taskId, photoUrl, or uploaderAddress." },
      { status: 400 }
    );
  }

  const uploader = String(uploaderAddress).toLowerCase();
  const taskIdNum = Number(taskId);

  const { data: rows, error: selectError } = await supabase
    .from("evidence_photos")
    .select("id")
    .eq("task_id", taskIdNum)
    .eq("photo_url", photoUrl)
    .eq("uploader_address", uploader)
    .limit(1);

  if (selectError) {
    return NextResponse.json({ error: selectError.message }, { status: 502 });
  }

  if (!rows?.length) {
    return NextResponse.json(
      { error: "Photo not found or you cannot remove it." },
      { status: 404 }
    );
  }

  const { error: deleteRowError } = await supabase
    .from("evidence_photos")
    .delete()
    .eq("task_id", taskIdNum)
    .eq("photo_url", photoUrl)
    .eq("uploader_address", uploader);

  if (deleteRowError) {
    return NextResponse.json({ error: deleteRowError.message }, { status: 502 });
  }

  const storagePath = storagePathFromPublicUrl(photoUrl);
  if (storagePath) {
    const { error: storageError } = await supabase.storage
      .from("task-evidence")
      .remove([storagePath]);
    if (storageError) {
      console.warn("evidence storage delete failed:", storageError.message);
    }
  }

  return NextResponse.json({ ok: true });
}
