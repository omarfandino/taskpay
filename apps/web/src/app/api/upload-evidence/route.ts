import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const maxDuration = 30;

const MAX_BYTES = 4_000_000;

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Supabase is not configured on the server. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.",
      },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Could not read upload. Try a smaller photo (under 4 MB)." },
      { status: 413 }
    );
  }

  const file = formData.get("file");
  const taskId = formData.get("taskId");
  const uploaderAddress = formData.get("uploaderAddress");

  if (!(file instanceof File) || !taskId || !uploaderAddress) {
    return NextResponse.json(
      { error: "Missing file, taskId, or uploaderAddress." },
      { status: 400 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { error: "Photo file is empty. Try again or pick another image." },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error:
          "Photo is too large (max 4 MB). Use Take photo or choose a smaller image.",
      },
      { status: 413 }
    );
  }

  const contentType = file.type || "image/jpeg";
  const ext =
    contentType.includes("png") || file.name.toLowerCase().endsWith(".png")
      ? "png"
      : "jpg";
  const path = `${taskId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("task-evidence")
    .upload(path, buffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    const message = uploadError.message || "Storage upload failed.";
    const lower = message.toLowerCase();
    let hint = "";
    if (lower.includes("bucket")) {
      hint =
        " Create public bucket 'task-evidence' in Supabase and run supabase/setup.sql.";
    } else if (lower.includes("policy") || lower.includes("row-level")) {
      hint =
        " Run supabase/setup.sql storage policies or set SUPABASE_SERVICE_ROLE_KEY in Vercel.";
    } else if (lower.includes("fetch failed")) {
      hint =
        " Check NEXT_PUBLIC_SUPABASE_URL in Vercel matches Project Settings → API in Supabase (project must be active).";
    }
    return NextResponse.json(
      { error: `${message}${hint}` },
      { status: 502 }
    );
  }

  const { data } = supabase.storage.from("task-evidence").getPublicUrl(path);
  const photoUrl = data.publicUrl;

  const { error: insertError } = await supabase.from("evidence_photos").insert({
    task_id: Number(taskId),
    uploader_address: String(uploaderAddress).toLowerCase(),
    photo_url: photoUrl,
  });

  if (insertError) {
    console.warn("evidence_photos insert failed:", insertError.message);
  }

  return NextResponse.json({ url: photoUrl });
}
