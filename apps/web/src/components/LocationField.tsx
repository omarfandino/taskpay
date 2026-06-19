"use client";

import { useCallback, useState } from "react";
import { Loader2, MapPin, Navigation } from "lucide-react";
import { getMapEmbedUrl, getMapUrl } from "@/lib/constants";
import { getCurrentPosition } from "@/lib/geo";
import {
  canPreviewLocation,
  locationFieldHint,
  resolveLocationInput,
  resolveLocationSync,
} from "@/lib/location";
import { cn } from "@/lib/utils";

type LocationFieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function LocationField({
  value,
  onChange,
  disabled = false,
}: LocationFieldProps) {
  const [hint, setHint] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);

  const previewValue = value.trim()
    ? resolveLocationSync(value).normalized || value.trim()
    : "";

  const processInput = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) {
        setHint(null);
        return;
      }

      setResolving(true);
      try {
        const resolved = await resolveLocationInput(trimmed);
        if (resolved.normalized && resolved.normalized !== trimmed) {
          onChange(resolved.normalized);
        }
        setHint(resolved.label ?? "Location ready");
      } finally {
        setResolving(false);
      }
    },
    [onChange]
  );

  async function handleUseCurrentLocation() {
    setLocating(true);
    setHint(null);
    try {
      const pos = await getCurrentPosition();
      const coords = `${pos.lat},${pos.lng}`;
      onChange(coords);
      setHint("Your current location — e.g. building lobby, home delivery");
    } catch {
      alert("Could not get your location. Check permissions.");
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground leading-relaxed">
        <strong className="text-foreground/80">Destination:</strong> paste a
        Maps link (short or long).{" "}
        <strong className="text-foreground/80">Deliver here:</strong> tap the
        GPS button for your current spot.
      </p>

      <div className="flex items-center gap-2">
        <input
          type="text"
          className="input-field-inline"
          placeholder={locationFieldHint()}
          value={value}
          disabled={disabled || resolving || locating}
          onChange={(e) => {
            onChange(e.target.value);
            setHint(null);
          }}
          onBlur={() => processInput(value)}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData("text").trim();
            if (!pasted) return;
            e.preventDefault();
            onChange(pasted);
            void processInput(pasted);
          }}
        />
        <button
          type="button"
          disabled={disabled || resolving || locating}
          onClick={handleUseCurrentLocation}
          aria-label="Use my current location"
          title="My current location"
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-input text-primary transition-colors duration-200",
            "hover:border-primary/40 hover:bg-primary/10 disabled:opacity-50 cursor-pointer"
          )}
        >
          {locating ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <Navigation className="h-5 w-5" aria-hidden />
          )}
        </button>
      </div>

      {(hint || resolving) && (
        <p className="flex items-center gap-1.5 text-xs text-primary">
          {resolving && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
          {resolving ? "Resolving Maps link…" : hint}
        </p>
      )}

      {canPreviewLocation(previewValue) && !resolving && (
        <div className="overflow-hidden rounded-xl border border-border">
          <iframe
            title="Location preview"
            src={getMapEmbedUrl(previewValue)}
            className="aspect-video w-full border-0 bg-muted"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <a
            href={getMapUrl(previewValue)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 border-t border-border bg-muted/50 px-3 py-2 text-xs font-semibold text-primary transition-colors duration-200 hover:text-primary/80 cursor-pointer"
          >
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            Open in Google Maps
          </a>
        </div>
      )}
    </div>
  );
}
