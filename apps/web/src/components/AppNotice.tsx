"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { X } from "lucide-react";

type NoticeTone = "info" | "error";

type AppNoticeItem = {
  id: string;
  message: string;
  tone: NoticeTone;
};

type AppNoticeContextValue = {
  showNotice: (message: string, tone?: NoticeTone) => void;
  dismissNotice: (id: string) => void;
};

const AppNoticeContext = createContext<AppNoticeContextValue | null>(null);

let noticeSeq = 0;

const toneStyles: Record<NoticeTone, string> = {
  info: "border-border/80 bg-card/95 text-muted-foreground",
  error: "border-amber-500/35 bg-amber-500/10 text-amber-100",
};

function AppNoticeStack({
  notices,
  onDismiss,
}: {
  notices: AppNoticeItem[];
  onDismiss: (id: string) => void;
}) {
  if (notices.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4"
      aria-live="polite"
    >
      {notices.map((notice) => (
        <div
          key={notice.id}
          role="status"
          className={`pointer-events-auto flex w-full max-w-lg items-start gap-2 rounded-xl border px-3 py-2 text-xs shadow-card backdrop-blur-sm ${toneStyles[notice.tone]}`}
        >
          <p className="min-w-0 flex-1 leading-snug">{notice.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(notice.id)}
            className="shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}

export function AppNoticeProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<AppNoticeItem[]>([]);

  const dismissNotice = useCallback((id: string) => {
    setNotices((prev) => prev.filter((notice) => notice.id !== id));
  }, []);

  const showNotice = useCallback(
    (message: string, tone: NoticeTone = "error") => {
      const id = `notice-${++noticeSeq}`;
      setNotices((prev) => [...prev.slice(-2), { id, message, tone }]);
    },
    []
  );

  const value = useMemo(
    () => ({ showNotice, dismissNotice }),
    [dismissNotice, showNotice]
  );

  return (
    <AppNoticeContext.Provider value={value}>
      {children}
      <AppNoticeStack notices={notices} onDismiss={dismissNotice} />
    </AppNoticeContext.Provider>
  );
}

export function useAppNotice() {
  const ctx = useContext(AppNoticeContext);
  if (!ctx) {
    throw new Error("useAppNotice must be used within AppNoticeProvider");
  }
  return ctx;
}
