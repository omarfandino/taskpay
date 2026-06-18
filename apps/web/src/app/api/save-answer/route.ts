import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { normalizeAnswerText } from "@/lib/taskAnswers";

export const maxDuration = 30;

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
    uploaderAddress?: string;
    answerText?: string;
  };

  const { taskId, uploaderAddress, answerText } = body;
  if (!taskId || !uploaderAddress || answerText === undefined) {
    return NextResponse.json(
      { error: "Missing taskId, uploaderAddress, or answerText." },
      { status: 400 }
    );
  }

  const normalized = normalizeAnswerText(answerText);
  if (!normalized) {
    return NextResponse.json(
      { error: "Answer cannot be empty." },
      { status: 400 }
    );
  }

  const uploader = String(uploaderAddress).toLowerCase();
  const taskIdNum = Number(taskId);
  const storagePath = `${taskIdNum}/answer.txt`;
  const buffer = Buffer.from(normalized, "utf-8");

  const { error: uploadError } = await supabase.storage
    .from("task-evidence")
    .upload(storagePath, buffer, {
      contentType: "text/plain; charset=utf-8",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message || "Could not store answer file." },
      { status: 502 }
    );
  }

  const { data: urlData } = supabase.storage
    .from("task-evidence")
    .getPublicUrl(storagePath);
  const answerUrl = urlData.publicUrl;

  const { error: upsertError } = await supabase.from("task_answers").upsert(
    {
      task_id: taskIdNum,
      uploader_address: uploader,
      answer_text: normalized,
      answer_url: answerUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "task_id,uploader_address" }
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, answerUrl });
}
