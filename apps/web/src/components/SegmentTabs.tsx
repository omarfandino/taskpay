"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tab = { id: string; label: string; icon?: React.ReactNode };

export function SegmentTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="mb-4 flex gap-1 rounded-full border border-border bg-muted p-1">
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          variant="ghost"
          className={cn(
            "min-h-[44px] flex-1 rounded-full font-bold gap-1.5 transition-colors duration-200",
            active === tab.id
              ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-transparent hover:text-foreground"
          )}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon}
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
