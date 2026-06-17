"use client";

import { useRef } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/*";

/** MiniPay / mobile WebViews often ignore display:none file inputs. */
const FILE_INPUT_CLASS =
  "absolute left-0 top-0 h-px w-px overflow-hidden opacity-0";

type EvidenceUploadButtonProps = {
  disabled?: boolean;
  uploading?: boolean;
  statusMsg?: string | null;
  onFileSelected: (file: File) => void;
};

export function EvidenceUploadButton({
  disabled = false,
  uploading = false,
  statusMsg,
  onFileSelected,
}: EvidenceUploadButtonProps) {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size === 0) {
      alert("Photo file is empty. Try Take photo again.");
      return;
    }
    onFileSelected(file);
  }

  function openGallery() {
    if (disabled) return;
    galleryInputRef.current?.click();
  }

  function openCamera() {
    if (disabled) return;
    cameraInputRef.current?.click();
  }

  return (
    <div className="relative space-y-3">
      <input
        ref={galleryInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className={FILE_INPUT_CLASS}
        disabled={disabled}
        onChange={handleChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        capture="environment"
        className={FILE_INPUT_CLASS}
        disabled={disabled}
        onChange={handleChange}
      />

      {uploading && statusMsg && (
        <p className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-center text-sm font-medium text-primary">
          {statusMsg}
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        className="h-12 w-full gap-2 rounded-2xl border-border bg-muted text-base font-bold hover:bg-muted/80"
        disabled={disabled}
        onClick={openGallery}
      >
        <ImagePlus className="h-5 w-5" />
        {uploading ? "Please wait…" : "Choose photo"}
      </Button>

      <Button
        type="button"
        className="h-14 w-full gap-2 rounded-2xl text-base font-bold shadow-glow"
        disabled={disabled}
        onClick={openCamera}
      >
        <Camera className="h-5 w-5" />
        {uploading ? "Please wait…" : "Take photo"}
      </Button>
    </div>
  );
}
