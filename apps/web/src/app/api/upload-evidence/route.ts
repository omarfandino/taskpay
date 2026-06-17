import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { error: "Supabase is not configured on the server." },
      { status: 503 }
    );
  }

  const formData = await request.formData();
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

  const contentType = file.type || "image/jpeg";
  const ext = contentType.includes("png") ? "png" : "jpg";
  const path = `${taskId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const supabase = createClient(url, key);
  const { error: uploadError } = await supabase.storage
    .from("task-evidence")
    .upload(path, buffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 502 });
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
