import { DEMO_STORAGE_MODE } from "./demo-config";

const MAX_DEMO_DATA_URL_BYTES = 400_000;

async function compressImage(file: File, maxSizeBytes = 800_000): Promise<Blob> {
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
        0.82
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image"));
    };

    img.src = url;
  });
}

async function prepareUploadBlob(file: File): Promise<Blob> {
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic");

  if (isHeic) {
    throw new Error(
      "HEIC photos are not supported. Use Take photo or save as JPEG."
    );
  }

  if (file.size === 0) {
    throw new Error("Photo file is empty. Try again.");
  }

  try {
    return await compressImage(file);
  } catch {
    return file;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read photo file"));
    reader.readAsDataURL(blob);
  });
}

async function uploadViaApi(
  taskId: string | number,
  uploaderAddress: string,
  blob: Blob,
  fileName: string
): Promise<string> {
  const formData = new FormData();
  formData.append("file", blob, fileName);
  formData.append("taskId", String(taskId));
  formData.append("uploaderAddress", uploaderAddress);

  const response = await fetch("/api/upload-evidence", {
    method: "POST",
    body: formData,
  });

  const raw = await response.text();
  let payload: { url?: string; error?: string };
  try {
    payload = JSON.parse(raw) as { url?: string; error?: string };
  } catch {
    throw new Error(
      response.status === 413
        ? "Photo is too large. Try Take photo or a smaller image."
        : `Upload server error (${response.status}). Check Supabase env vars on Vercel.`
    );
  }

  if (!response.ok || !payload.url) {
    throw new Error(payload.error || "Upload failed.");
  }

  return payload.url;
}

async function uploadDemoFallback(blob: Blob): Promise<string> {
  if (blob.size > MAX_DEMO_DATA_URL_BYTES) {
    const smaller = await compressImage(
      new File([blob], "photo.jpg", { type: blob.type || "image/jpeg" }),
      MAX_DEMO_DATA_URL_BYTES
    );
    return blobToDataUrl(smaller);
  }
  return blobToDataUrl(blob);
}

function mapUploadError(message: string): string {
  if (
    message.includes("Bucket not found") ||
    message.includes("not found")
  ) {
    return "Storage bucket missing. Create public bucket 'task-evidence' in Supabase.";
  }
  if (
    message.includes("policy") ||
    message.includes("Unauthorized") ||
    message.includes("403") ||
    message.includes("row-level security")
  ) {
    return "Upload blocked by Supabase. Run supabase/setup.sql storage policies.";
  }
  return message;
}

const MAX_UPLOAD_BYTES = 3_500_000;

export async function uploadEvidencePhoto(
  taskId: string | number,
  uploaderAddress: string,
  file: File
): Promise<string> {
  const blob = await prepareUploadBlob(file);
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      "Photo is too large after compression. Try Take photo or a smaller image."
    );
  }
  const fileName = file.name || `evidence-${Date.now()}.jpg`;

  try {
    return await uploadViaApi(taskId, uploaderAddress, blob, fileName);
  } catch (apiError) {
    if (!DEMO_STORAGE_MODE) {
      throw new Error(
        mapUploadError(
          apiError instanceof Error ? apiError.message : "Upload failed."
        )
      );
    }

    console.warn("Supabase upload failed in demo mode, using local fallback", apiError);
    return uploadDemoFallback(blob);
  }
}
