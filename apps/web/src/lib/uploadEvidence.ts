import { getSupabase } from "./supabase";

async function compressImage(file: File, maxSizeBytes = 1_000_000): Promise<Blob> {
  if (file.size <= maxSizeBytes) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      const scale = Math.min(1, Math.sqrt(maxSizeBytes / file.size));
      width = Math.floor(width * scale);
      height = Math.floor(height * scale);
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Could not compress image"));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        0.85
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image"));
    };

    img.src = url;
  });
}

export async function uploadEvidencePhoto(
  taskId: string | number,
  uploaderAddress: string,
  file: File
): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const compressed = await compressImage(file);
  const path = `${taskId}/${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("task-evidence")
    .upload(path, compressed, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from("task-evidence").getPublicUrl(path);
  const photoUrl = data.publicUrl;

  await supabase.from("evidence_photos").insert({
    task_id: Number(taskId),
    uploader_address: uploaderAddress.toLowerCase(),
    photo_url: photoUrl,
  });

  return photoUrl;
}
