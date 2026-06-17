import { DEMO_STORAGE_MODE } from "@/lib/demo-config";

export function DemoStorageBanner() {
  if (!DEMO_STORAGE_MODE) return null;

  return (
    <div className="border-b border-primary/20 bg-primary/5 px-4 py-2 text-center text-xs text-muted-foreground">
      Demo storage mode — tasks in localStorage, no on-chain transactions.
    </div>
  );
}
